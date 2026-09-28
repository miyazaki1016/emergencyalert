import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { nextLastNotifiedAt, shouldNotifyForRain } from "./notificationDecision.ts";

type RainEvent = { schemaVersion:1; eventType:string; urgency:"INFO"|"LIFESTYLE_ACTION"; suggestedAction:string; startsAt:string|null; actionableAt:string|null; endingAt:string|null; source:string; checkedAt:string; sourceValidAt:string|null; };
type Rgba = { r:number; g:number; b:number; a:number };
type RainResponse = { checkedAt?:string; sourceValidAt?:string|null; event?:RainEvent|null; interpretationEnabled?:boolean; diagnostic?:unknown; observation?:Array<{status?:string;rgba?:Rgba|null}>; forecast?:Array<{baseTime?:string;validTime?:string;status?:string;intensityClass?:string|null;rgba?:Rgba|null}>; };
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
 for(const target of targets??[]){try{
  const notificationLabel=target.label&&(labelCounts.get(target.label)??0)>1&&target.display_name?`${target.label}（${target.display_name}）`:target.label;
  const rainUrl=new URL("https://emergencyalert-gilt.vercel.app/api/rain"); rainUrl.searchParams.set("lat",String(target.latitude)); rainUrl.searchParams.set("lon",String(target.longitude));
  const response=await fetch(rainUrl,{headers:{accept:"application/json"}}); if(!response.ok)throw new Error("rain_unavailable");
  const rain=await response.json() as RainResponse; const checkedAt=rain.checkedAt??new Date().toISOString(); const diagnostic=rain.diagnostic&&typeof rain.diagnostic==="object"?{...(rain.diagnostic as Record<string,unknown>),forecastDetails:rain.forecast?.map(frame=>({baseTime:frame.baseTime??null,validTime:frame.validTime??null,status:frame.status??null,intensityClass:frame.intensityClass??null,rgba:frame.rgba??null}))??[]}:rain.diagnostic??null;
  await db.from("rain_diagnostic_history").insert({target_id:target.id,checked_at:checkedAt,source_valid_at:rain.sourceValidAt??rain.event?.sourceValidAt??null,interpretation_enabled:Boolean(rain.interpretationEnabled),event_type:rain.event?.eventType??null,urgency:rain.event?.urgency??null,current_status:rain.observation?.[0]?.status??null,current_rgba:rain.observation?.[0]?.rgba??null,diagnostic});
  if(!rain.interpretationEnabled||!rain.event){await db.from("watch_states").upsert({target_id:target.id,last_checked_at:checkedAt,updated_at:new Date().toISOString()},{onConflict:"target_id"});results.push({id:target.id,status:"UNKNOWN"});continue;}
  const {data:previous}=await db.from("watch_states").select("last_event,last_notified_at,rain_ending_notified,clear_streak,rain_streak,rain_confirmed_notified,confirmed_weather,severe_rain_level").eq("target_id",target.id).maybeSingle();
  const previousEvent=previous?.last_event as RainEvent|null|undefined; const actionable=rain.event.urgency==="LIFESTYLE_ACTION";
  const currentStatus=rain.observation?.[0]?.status??null;
  const rainStreak=currentStatus==="RAIN"?Math.min(Number(previous?.rain_streak??0)+1,3):0;
  const clearStreak=currentStatus==="NO_RAIN"?Math.min(Number(previous?.clear_streak??0)+1,3):0;
  const rainConfirmed=rainStreak>=3&&!previous?.rain_confirmed_notified;
  const severeRank=(v?:string|null)=>v==="GTE_80"?3:v==="50_TO_80"?2:v==="30_TO_50"?1:0;
  const severeFrame=(rain.forecast??[]).filter(f=>f.validTime&&new Date(f.validTime).getTime()>=Date.now()&&severeRank(f.intensityClass)>0).sort((a,b)=>severeRank(b.intensityClass)-severeRank(a.intensityClass)||new Date(a.validTime!).getTime()-new Date(b.validTime!).getTime())[0];
  const severeLevel=severeRank(severeFrame?.intensityClass); const previousSevere=Number(previous?.severe_rain_level??0); const severeEscalation=severeLevel>previousSevere;
  const initialRaining=false;
  const rainEnding=rain.event.eventType==="RAIN_ENDING"&&previousEvent?.eventType!=="RAIN_ENDING"&&!previous?.rain_ending_notified;
  const shouldNotify=Boolean(target.notifications_enabled)&&(severeEscalation||shouldNotifyForRain({notificationsEnabled:true,currentUrgency:rain.event.urgency,previousUrgency:previousEvent?.urgency,lastNotifiedAt:previous?.last_notified_at,initialRaining,rainEnding}));
  let delivered=0,failed=0;
  const severeMinutes=severeFrame?.validTime?Math.max(0,Math.round((new Date(severeFrame.validTime).getTime()-Date.now())/60000)):null;
  const severeName=severeLevel===3?"猛烈な雨":severeLevel===2?"非常に激しい雨":"激しい雨";
  const severeBody=notificationLabel?`${notificationLabel}：${severeMinutes===0?"まもなく":`約${severeMinutes}分後`}に${severeName}（${severeLevel===3?"80mm/h以上":severeLevel===2?"50〜80mm/h":"30〜50mm/h"}）の予測です。周囲の状況に注意してね`:`${severeMinutes===0?"まもなく":`約${severeMinutes}分後`}に${severeName}の予測です。周囲の状況に注意してね`;
  const confirmedAndEnding=rainConfirmed&&rain.event.eventType==="RAIN_ENDING";
  const returningRain=previous?.confirmed_weather==="RAINING"&&clearStreak>0&&clearStreak<3&&actionable;
  const body=severeEscalation?severeBody:confirmedAndEnding?(notificationLabel?`${notificationLabel}の雨、もうすぐ止みそうだよ🌥️`:"雨、もうすぐ止みそうだよ🌥️"):initialRaining?(notificationLabel?`${notificationLabel}はいま雨が降ってるよ☔️`:"いま雨が降ってるよ☔️"):rainEnding?(notificationLabel?`${notificationLabel}の雨、もうすぐ止みそうだよ🌥️`:"雨、もうすぐ止みそうだよ🌥️"):returningRain?(notificationLabel?`${notificationLabel}：いったん弱まってるけど、また降りそうだよ☔️`:"いったん弱まってるけど、また降りそうだよ☔️"):(rain.event.suggestedAction==="BRING_LAUNDRY_INSIDE"?(notificationLabel?`${notificationLabel}：もうすぐ雨が来そうだよ☔️ 洗濯物を確認してね`:"もうすぐ雨が来そうだよ☔️ 洗濯物を確認してね"):(notificationLabel?`${notificationLabel}：${rain.event.suggestedAction}`:rain.event.suggestedAction));
  const notificationEventType=severeEscalation?`SEVERE_RAIN_${severeLevel}`:confirmedAndEnding?"RAIN_ENDING":rainEnding?"RAIN_ENDING":returningRain?"RAIN_RETURNING":rain.event.eventType;
  const notificationUrgency=severeEscalation?"DISASTER":rain.event.urgency;
  if(shouldNotify){const {data:subscriptions}=await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("owner_id",target.owner_id);
   const payload=JSON.stringify({title:"EmergencyAlert",body,url:"/",data:{targetId:target.id,eventType:notificationEventType}});
   for(const sub of subscriptions??[]){try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload);delivered++;}catch(err){const statusCode=Number((err as {statusCode?:number})?.statusCode??0);if(statusCode===404||statusCode===410)await db.from("push_subscriptions").delete().eq("id",sub.id);else failed++;}}
  }
  const now=new Date().toISOString();
  if(delivered>0){await db.from("notification_deliveries").insert({owner_id:target.owner_id,target_id:target.id,event_type:notificationEventType,urgency:notificationUrgency,title:"EmergencyAlert",body,delivered_at:now,delivered_count:delivered});}
  const notifiedAt=nextLastNotifiedAt({delivered,actionable,previousLastNotifiedAt:previous?.last_notified_at,now});
  const endingNotified=clearStreak>=3?false:(Boolean(previous?.rain_ending_notified)||((rainEnding||confirmedAndEnding)&&delivered>0));
  const rainConfirmedNotified=clearStreak>=3?false:(Boolean(previous?.rain_confirmed_notified)||(rainConfirmed&&delivered>0));
  const confirmedWeather=rainStreak>=3?"RAINING":clearStreak>=3?"DRY":(previous?.confirmed_weather??"UNKNOWN");
  const persistedSevere=clearStreak>=3?0:Math.max(previousSevere,severeLevel);
  await db.from("watch_states").upsert({target_id:target.id,last_event:rain.event,last_checked_at:checkedAt,last_notified_at:notifiedAt,rain_ending_notified:endingNotified,clear_streak:clearStreak,rain_streak:rainStreak,rain_confirmed_notified:rainConfirmedNotified,confirmed_weather:confirmedWeather,severe_rain_level:persistedSevere,updated_at:now},{onConflict:"target_id"});
  results.push({id:target.id,status:rain.event.eventType,initialRaining,rainEnding,shouldNotify,delivered,failed});
 }catch(err){results.push({id:target.id,status:"CHECK_FAILED",error:String((err as Error)?.message??err)});}}
 return Response.json({ok:true,checked:results.length,results});
});