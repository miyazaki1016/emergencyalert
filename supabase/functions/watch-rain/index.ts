import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { advanceObservationStreak, nextLastNotifiedAt, nextRainEndingNotified } from "./notificationDecision.ts";

import { makeSnapshot, timestamp, type Frame } from "../_shared/rainReplay.ts";
import { bestEffort } from "../_shared/replayRecording.ts";

type RainEvent = { schemaVersion:1; eventType:string; urgency:"INFO"|"LIFESTYLE_ACTION"; suggestedAction:string; startsAt:string|null; actionableAt:string|null; endingAt:string|null; source:string; checkedAt:string; sourceValidAt:string|null; };
import {advanceForecastEpisode,forecastEpisodeDecision,forecastSignal,bootstrapForecastEpisode,severeForecast,type ForecastEpisode} from './forecastEpisode.ts';
import {guardedPush} from './deliveryGuard.ts';
type Rgba = { r:number; g:number; b:number; a:number };
type RainResponse = { checkedAt?:string; sourceValidAt?:string|null; event?:RainEvent|null; interpretationEnabled?:boolean; interpretation?:unknown; diagnostic?:unknown; expectedForecastFrames?:number|null; observation?:Frame[]; forecast?:Array<{baseTime?:string;validTime?:string;status?:string;intensityClass?:string|null;rgba?:Rgba|null}>; };
const VAPID_PUBLIC_KEY="BBOurfjBkBMea0Hx90WiF83hmif8qv8LI1hFOx6AthWJQhkIWnhnUUZ0LYm7tyYg_3q1Aq3YP6mbJOtKjWA-Nec";

Deno.serve(async(req:Request)=>{
 const expected=Deno.env.get("WATCH_CRON_TOKEN"); if(!expected||req.headers.get("x-watch-token")!==expected)return Response.json({error:"unauthorized"},{status:401});
 const url=Deno.env.get("SUPABASE_URL"), serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), vapidPrivateKey=Deno.env.get("VAPID_PRIVATE_KEY");
 if(!url||!serviceKey||!vapidPrivateKey)return Response.json({error:"server_config"},{status:500});
 webpush.setVapidDetails("mailto:emergencyalert@example.com",VAPID_PUBLIC_KEY,vapidPrivateKey);
 const db=createClient(url,serviceKey,{auth:{persistSession:false}});
 const {data:targets,error}=await db.from("watch_targets").select("id,owner_id,label,display_name,latitude,longitude,notifications_enabled").eq("enabled",true).limit(100);
 if(error)return Response.json({error:"target_query_failed"},{status:500});
 const labelCounts=new Map<string,number>();
 for(const target of targets??[]){if(target.label)labelCounts.set(target.label,(labelCounts.get(target.label)??0)+1);}
 const results=[];
 for(const target of targets??[]){let lease:string|null=null;try{
  const claimed=await db.rpc('claim_rain_watch_target',{p_target:target.id});if(claimed.error)throw Error('WATCH_CLAIM_FAILED');lease=claimed.data;
  if(!lease){results.push({id:target.id,status:'BUSY'});continue;}
  const runtime=await db.from('rain_watch_runtime').select('episode').eq('target_id',target.id).single();if(runtime.error)throw Error('RUNTIME_READ_FAILED');
  const persist=async(episode:ForecastEpisode,watch:Record<string,unknown>|null=null)=>{const r=await db.rpc('save_rain_watch_runtime',{p_target:target.id,p_lease:lease,p_episode:episode,p_watch_state:watch});if(r.error||r.data!==true)throw Error('WATCH_FENCE_OR_WRITE_FAILED');};
  const notificationLabel=target.label&&(labelCounts.get(target.label)??0)>1&&target.display_name?`${target.label}（${target.display_name}）`:target.label;
  const rainUrl=new URL("https://emergencyalert-gilt.vercel.app/api/rain"); rainUrl.searchParams.set("lat",String(target.latitude)); rainUrl.searchParams.set("lon",String(target.longitude));
  const response=await fetch(rainUrl,{headers:{accept:"application/json"}}); if(!response.ok)throw new Error("rain_unavailable");
  const rain=await response.json() as RainResponse; const checkedAt=rain.checkedAt??new Date().toISOString(); const forecastDetails=(rain.forecast??[]).map(frame=>({baseTime:frame.baseTime??null,validTime:frame.validTime??null,status:frame.status??null,intensityClass:frame.intensityClass??null,rgba:frame.rgba??null}));
  const expectedFrames=Number.isInteger(rain.expectedForecastFrames)&&Number(rain.expectedForecastFrames)>0?Number(rain.expectedForecastFrames):null;
  const usable=forecastDetails.filter(f=>typeof f.baseTime==="string"&&typeof f.validTime==="string"&&(f.status==="RAIN"||f.status==="NO_RAIN"));
  const evidenceState=forecastDetails.length===0?"MISSING":expectedFrames===null||usable.length!==forecastDetails.length||forecastDetails.length!==expectedFrames?"PARTIAL":"COMPLETE";
  // Preserve diagnostic null semantics in the API; independently persist the forecast evidence.
  const diagnostic={...(rain.diagnostic&&typeof rain.diagnostic==="object"?rain.diagnostic as Record<string,unknown>:{}),forecastDetails,forecastEvidence:{state:evidenceState,expectedFrames,receivedFrames:forecastDetails.length,usableFrames:usable.length}};
  await db.from("rain_diagnostic_history").insert({target_id:target.id,checked_at:checkedAt,source_valid_at:rain.sourceValidAt??rain.event?.sourceValidAt??null,interpretation_enabled:Boolean(rain.interpretationEnabled),event_type:rain.event?.eventType??null,urgency:rain.event?.urgency??null,current_status:rain.observation?.[0]?.status??null,current_rgba:rain.observation?.[0]?.rgba??null,diagnostic});

  const {data:previous,error:previousError}=await db.from("watch_states").select("last_event,last_notified_at,rain_ending_notified,clear_streak,rain_streak,rain_confirmed_notified,confirmed_weather,severe_rain_level").eq("target_id",target.id).maybeSingle();
  if(previousError)throw Error('WATCH_STATE_READ_FAILED');
  const signal=forecastSignal(rain,Date.now());
  let episode=runtime.data.episode as ForecastEpisode;
  if(!episode.id){
   const recent=await db.from('rain_diagnostic_history').select('source_valid_at,event_type,checked_at').eq('target_id',target.id).order('checked_at',{ascending:false}).limit(20);
   if(recent.error)throw Error('EPISODE_BOOTSTRAP_FAILED');
   episode=bootstrapForecastEpisode(crypto.randomUUID(),previous,recent.data??[],signal.validAt??rain.sourceValidAt??null);
  }
  episode=advanceForecastEpisode(episode,signal.signal,signal.validAt,crypto.randomUUID());
  await persist(episode);
  if(!rain.interpretationEnabled||!rain.event){results.push({id:target.id,status:'UNKNOWN'});continue;}
  const previousEvent=previous?.last_event as RainEvent|null|undefined; const actionable=rain.event.urgency==="LIFESTYLE_ACTION";
  const currentStatus=rain.observation?.[0]?.status??null;
  const observation=advanceObservationStreak({status:currentStatus,validAt:rain.sourceValidAt??null,previousValidAt:(previousEvent as RainEvent & {observationValidAt?:string|null}|null)?.observationValidAt??previousEvent?.sourceValidAt??null,previousRainStreak:Number(previous?.rain_streak??0),previousClearStreak:Number(previous?.clear_streak??0)});
  const {rainStreak,clearStreak}=observation;
  const episodeClosed=clearStreak>=3;
  const rainConfirmed=rainStreak>=3&&!previous?.rain_confirmed_notified;
  const severeRank=(v?:string|null)=>v==="GTE_80"?3:v==="50_TO_80"?2:v==="30_TO_50"?1:0;
  const severeFrame=severeForecast(rain.forecast??[],Date.now());
  const severeLevel=severeRank(severeFrame?.intensityClass);const previousSevere=episode.peakSevere;
  const severeEscalation=Boolean(target.notifications_enabled)&&severeLevel>0&&previousSevere===0;
  const initialRaining=false;
  const rainEnding=!episodeClosed&&rain.event.eventType==="RAIN_ENDING"&&previousEvent?.eventType!=="RAIN_ENDING"&&!previous?.rain_ending_notified&&previous?.confirmed_weather==="RAINING";
  const confirmedAndEnding=!episodeClosed&&rainConfirmed&&rain.event.eventType==="RAIN_ENDING"&&!previous?.rain_ending_notified;
  const decision=forecastEpisodeDecision(episode,Boolean(target.notifications_enabled),actionable,severeLevel,rainEnding||confirmedAndEnding);
  const shouldNotify=decision.notify;let intentRecorded=false;

  let delivered=0,failed=0;
  const severeMinutes=severeFrame?.validTime?Math.max(0,Math.round((timestamp(severeFrame.validTime)!-Date.now())/60000)):null;
  const severeName=severeLevel===3?"猛烈な雨":severeLevel===2?"非常に激しい雨":"激しい雨";
  const severeBody=notificationLabel?`${notificationLabel}：${severeMinutes===0?"まもなく":`約${severeMinutes}分後`}に${severeName}（${severeLevel===3?"80mm/h以上":severeLevel===2?"50〜80mm/h":"30〜50mm/h"}）の予測です。周囲の状況に注意してね`:`${severeMinutes===0?"まもなく":`約${severeMinutes}分後`}に${severeName}の予測です。周囲の状況に注意してね`;
  const returningRain=false;
  const upcomingClasses=(rain.forecast??[]).filter(f=>f.status==="RAIN"&&f.validTime&&(f.intensityClass==="1_TO_5"||f.intensityClass==="5_TO_10"));
  const actionableAt=rain.event.actionableAt;
  const selectedClass=upcomingClasses.find(f=>f.validTime===actionableAt)?.intensityClass;
  const laundryBody=notificationLabel?selectedClass==="1_TO_5"?notificationLabel+"：このあと雨が続きそう。洗濯物を確認してね":notificationLabel+"：30分以内に雨が降りそう。洗濯物を確認してね":selectedClass==="1_TO_5"?"このあと雨が続きそう。洗濯物を確認してね":"30分以内に雨が降りそう。洗濯物を確認してね";
  const body=severeEscalation?severeBody:confirmedAndEnding?(notificationLabel?`${notificationLabel}の雨、もうすぐ止みそうだよ🌥️`:"雨、もうすぐ止みそうだよ🌥️"):initialRaining?(notificationLabel?`${notificationLabel}はいま雨が降ってるよ☔️`:"いま雨が降ってるよ☔️"):rainEnding?(notificationLabel?`${notificationLabel}の雨、もうすぐ止みそうだよ🌥️`:"雨、もうすぐ止みそうだよ🌥️"):returningRain?(notificationLabel?`${notificationLabel}：いったん弱まってるけど、また降りそうだよ☔️`:"いったん弱まってるけど、また降りそうだよ☔️"):(rain.event.suggestedAction==="BRING_LAUNDRY_INSIDE"?laundryBody:(notificationLabel?`${notificationLabel}：${rain.event.suggestedAction}`:rain.event.suggestedAction));
  const notificationEventType=severeEscalation?"SEVERE_RAIN":confirmedAndEnding?"RAIN_ENDING":rainEnding?"RAIN_ENDING":returningRain?"RAIN_RETURNING":rain.event.eventType;
  const notificationUrgency=severeEscalation?"DISASTER":rain.event.urgency;
  const replayId=crypto.randomUUID();
  const replaySnapshot=shouldNotify?makeSnapshot({eventType:notificationEventType,decidedAt:new Date().toISOString(),latitude:target.latitude,longitude:target.longitude,title:notificationEventType==="RAIN_ENDING"?"🌤️ 雨がやみそう":"🌧️ 雨が降りそう",body,rain,previousState:previous??null,severeTargetTime:notificationEventType==='SEVERE_RAIN'?severeFrame?.validTime:null}):null;
  const replayFailure=()=>console.warn("[rain-replay] recording_failed");
  let replayRecorded=false, subscriptionCount=0, subscriptionQueryFailed=false, replayFailed=0, replayUnknown=0;
  const sendStartedAt=new Date().toISOString();
  if(replaySnapshot){
   const targetMs=timestamp(replaySnapshot.targetTime);
   const inserted=await bestEffort(()=>db.from("rain_notification_evaluations").insert({id:replayId,owner_id:target.owner_id,target_id:target.id,event_type:notificationEventType,target_time:targetMs===null?null:new Date(targetMs).toISOString(),snapshot:replaySnapshot,send_started_at:sendStartedAt,deadline_at:new Date((targetMs??Date.now())+50*60000).toISOString()}).select("id").abortSignal(AbortSignal.timeout(1000)).single(),replayFailure);
   replayRecorded=Boolean(inserted);
  }
  if(shouldNotify){const {data:subscriptions,error:subscriptionError}=await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("owner_id",target.owner_id);
   subscriptionCount=subscriptions?.length??0;subscriptionQueryFailed=Boolean(subscriptionError);
   const payload=JSON.stringify({title:severeEscalation?"🚨 大雨警戒":(notificationEventType==="RAIN_ENDING"?"🌤️ 雨がやみそう":"🌧️ 雨が降りそう"),body,url:"/",data:{targetId:target.id,eventType:notificationEventType}});
   if(subscriptionError)throw Error('SUBSCRIPTION_QUERY_FAILED');
   for(const sub of subscriptions??[]){
    const outcome=await guardedPush({
     claim:async()=>{const r=await db.rpc('claim_rain_push_attempt',{p_target:target.id,p_lease:lease,p_event:decision.key,p_subscription:sub.id});if(r.error)throw Error('PUSH_CLAIM_FAILED');return r.data;},
     send:async()=>{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload,{timeout:5000});},
     finish:async(id,state)=>{const r=await db.rpc('finish_rain_push_attempt',{p_attempt:id,p_status:state});if(r.error)throw Error('PUSH_OUTCOME_WRITE_FAILED');},
    });
    if(outcome==='SKIPPED')continue;
    if(outcome.state==='ACCEPTED')delivered++;else{const code=Number((outcome.error as {statusCode?:number})?.statusCode??0);if(outcome.state==='FAILED_TERMINAL')replayFailed++;else replayUnknown++;if(code===404||code===410)await db.from('push_subscriptions').delete().eq('id',sub.id);else failed++;}
   }
   if(subscriptions?.length){
    // All subscriptions have durable intents/results. A crash before this point
    // resumes remaining subscriptions; unique attempts skip those already sent.
    episode={...episode,approachNotified:episode.approachNotified||actionable||severeEscalation,peakSevere:Math.max(episode.peakSevere,severeLevel)};await persist(episode);intentRecorded=true;
   }
  }
  const now=new Date().toISOString();
  let replayNotificationId:number|null=null,replayHistoryFailed=false;
  if(delivered>0){const deliveryResult=await db.from("notification_deliveries").insert({owner_id:target.owner_id,target_id:target.id,event_type:notificationEventType,urgency:notificationUrgency,title:severeEscalation?"🚨 大雨警戒":(notificationEventType==="RAIN_ENDING"?"🌤️ 雨がやみそう":"🌧️ 雨が降りそう"),body,delivered_at:now,delivered_count:delivered}).select("id").single();replayNotificationId=deliveryResult.data?.id??null;replayHistoryFailed=Boolean(deliveryResult.error);}
  const notifiedAt=nextLastNotifiedAt({delivered,actionable,previousLastNotifiedAt:previous?.last_notified_at,now});
  const endingNotified=episodeClosed?false:nextRainEndingNotified({previousRainEndingNotified:Boolean(previous?.rain_ending_notified),rainStreak,endingDelivered:!severeEscalation&&(rainEnding||confirmedAndEnding)&&delivered>0});
  const rainConfirmedNotified=clearStreak>=3?false:(Boolean(previous?.rain_confirmed_notified)||rainConfirmed);
  const confirmedWeather=rainStreak>=3?"RAINING":clearStreak>=3?"DRY":(previous?.confirmed_weather??"UNKNOWN");
  const persistedSevere=episode.peakSevere;
  await persist(episode,{last_event:{...rain.event,observationValidAt:observation.observationValidAt},last_checked_at:checkedAt,last_notified_at:notifiedAt,rain_ending_notified:endingNotified,clear_streak:clearStreak,rain_streak:rainStreak,rain_confirmed_notified:rainConfirmedNotified,confirmed_weather:confirmedWeather,severe_rain_level:persistedSevere,updated_at:now});
  if(replayRecorded){
   await bestEffort(()=>db.from("rain_notification_evaluations").update({notification_id:replayNotificationId,accepted_count:delivered,failed_count:replayFailed,unknown_count:replayUnknown,delivery_status:delivered>0?"ACCEPTED":subscriptionQueryFailed||replayUnknown>0?"UNKNOWN":subscriptionCount===0?"NO_SUBSCRIPTIONS":"FAILED",delivery_record_status:replayHistoryFailed?"WRITE_FAILED":replayNotificationId!==null?"LINKED":"NOT_APPLICABLE",send_settled_at:now}).eq("id",replayId).abortSignal(AbortSignal.timeout(1000)),replayFailure);
  }
  results.push({id:target.id,status:rain.event.eventType,initialRaining,rainEnding,shouldNotify,delivered,failed,forecastEpisode:episode.id,forecastClearStreak:episode.clearForecasts,intentRecorded,forecastSignal:signal.signal,forecastApproachLatched:episode.approachNotified,suppressionReason:actionable&&!shouldNotify?'FORECAST_EPISODE_ALREADY_NOTIFIED':null});
 }catch(err){results.push({id:target.id,status:"CHECK_FAILED",error:String((err as Error)?.message??err)});}finally{if(lease){const released=await db.rpc('release_rain_watch_target',{p_target:target.id,p_lease:lease});if(released.error)console.warn('[rain-watch] lease_release_failed');}}}
 return Response.json({ok:true,checked:results.length,results});
});