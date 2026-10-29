import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {makeSnapshot} from '../supabase/functions/_shared/rainReplay';
import {bestEffort} from '../supabase/functions/_shared/replayRecording';
import * as episodes from '../supabase/functions/watch-rain/forecastEpisode';
import {guardedPush} from '../supabase/functions/watch-rain/deliveryGuard';
import * as decision from '../supabase/functions/watch-rain/notificationDecision';
async function run(recordError=false,historyError=false,pushError=false,repeats=1,finishError=false,stateError=false,alreadyNotified=false){
 const order:string[]=[],writes:Array<{table:string;op:string;value:any}>=[];let handler:any;
 const time=new Date(),target=new Date(Math.ceil((time.getTime()+10*60000)/300000)*300000).toISOString();
 let runtime:any={},previous:any={last_notified_at:alreadyNotified?'2026-10-29T03:45:00Z':null,clear_streak:3,rain_streak:0,last_event:{sourceValidAt:'20261029034000',urgency:'LIFESTYLE_ACTION'}},locked=false;const intents=new Set<string>();
 const db={async rpc(name:string,args:any){order.push(name);if(name==='claim_rain_watch_target'){if(locked)return {data:null,error:null};locked=true;return {data:'lease',error:null};}if(name==='release_rain_watch_target'){locked=false;return {data:null,error:null};}if(name==='save_rain_watch_runtime'){if(args.p_watch_state&&stateError)return {data:null,error:Error('state write failed')};runtime=structuredClone(args.p_episode);if(args.p_watch_state){previous=args.p_watch_state;writes.push({table:'watch_states',op:'upsert',value:previous});}return {data:true,error:null};}if(name==='claim_rain_push_attempt'){if(intents.has(args.p_event+'/'+args.p_subscription))return {data:null,error:null};intents.add(args.p_event+'/'+args.p_subscription);return {data:'intent',error:null};}if(name==='finish_rain_push_attempt')return {data:null,error:finishError?Error('outcome write failed'):null};throw Error(name);},from(table:string){let op='select',value:any;const chain:any={};for(const name of ['select','eq','limit','maybeSingle','single','abortSignal','order'])chain[name]=()=>chain;
 for(const name of ['insert','update','upsert','delete'])chain[name]=(v:any)=>{op=name;value=v;writes.push({table,op,value});return chain;};
 chain.then=(resolve:any,reject:any)=>{order.push(`${table}:${op}`);let result:any={data:null,error:null};
 if(table==='watch_targets')result.data=[{id:'target',owner_id:'owner',latitude:35.6,longitude:139.8,notifications_enabled:true,label:'test'}];
 if(table==='watch_states'&&op==='select')result.data=previous;
 if(table==='rain_watch_runtime')result.data={episode:runtime};
 if(table==='rain_diagnostic_history'&&op==='select')result.data=[];
 if(table==='push_subscriptions')result.data=[{id:'sub',endpoint:'private',p256dh:'private',auth:'private'}];
 if(table==='rain_notification_evaluations'&&op==='insert')result=recordError?{error:Error('record failed')}:{data:{id:'evaluation'}};
 if(table==='notification_deliveries')result=historyError?{error:Error('write failed')}:{data:{id:123}};
 return Promise.resolve(result).then(resolve,reject);};return chain;}};
 const source=readFileSync('supabase/functions/watch-rain/index.ts','utf8').replace(/^import .*;\n/gm,'');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const {timestamp}=await import('../supabase/functions/_shared/rainReplay');
 const injected={createClient:()=>db,webpush:{setVapidDetails(){},async sendNotification(){order.push('PUSH');if(pushError)throw {statusCode:0};}},...decision,...episodes,guardedPush,makeSnapshot,timestamp,bestEffort,Deno:{env:{get:()=> 'config'},serve:(fn:any)=>handler=fn},fetch:async()=>({ok:true,json:async()=>({checkedAt:time.toISOString(),interpretationEnabled:true,event:{eventType:'ACTIONABLE_RAIN_APPROACHING',urgency:'LIFESTYLE_ACTION',suggestedAction:'BRING_LAUNDRY_INSIDE',actionableAt:target},observation:[],forecast:[]})})};
 new Function(...Object.keys(injected),code)(...Object.values(injected));
 let response:any;for(let i=0;i<repeats;i++)response=await handler(new Request('https://test.invalid',{headers:{'x-watch-token':'config'}}));
 return {order,writes,body:await response.json()};
}
it('records before Push, links accepted history, preserves state update',async()=>{const r=await run();expect(r.body.results[0].delivered).toBe(1);expect(r.order.indexOf('rain_notification_evaluations:insert')).toBeLessThan(r.order.indexOf('PUSH'));expect(r.order.filter(x=>x==='PUSH')).toHaveLength(1);expect(r.writes.find(x=>x.table==='rain_notification_evaluations'&&x.op==='update')?.value).toMatchObject({notification_id:123,accepted_count:1,delivery_status:'ACCEPTED',delivery_record_status:'LINKED'});expect(r.writes.some(x=>x.table==='watch_states'&&x.op==='upsert')).toBe(true);});
it('recording failure cannot suppress notification or state update',async()=>{const r=await run(true);expect(r.body.results[0].delivered).toBe(1);expect(r.order.filter(x=>x==='PUSH')).toHaveLength(1);expect(r.writes.some(x=>x.table==='watch_states'&&x.op==='upsert')).toBe(true);});
it('history failure records accepted-but-unlinked without resending',async()=>{const r=await run(false,true);expect(r.order.filter(x=>x==='PUSH')).toHaveLength(1);expect(r.writes.find(x=>x.table==='rain_notification_evaluations'&&x.op==='update')?.value).toMatchObject({accepted_count:1,delivery_record_status:'WRITE_FAILED'});});
it('uncertain Push does not become a delivery or a safe retry',async()=>{const r=await run(false,false,true);expect(r.writes.some(x=>x.table==='notification_deliveries')).toBe(false);expect(r.writes.find(x=>x.table==='rain_notification_evaluations'&&x.op==='update')?.value).toMatchObject({accepted_count:0,unknown_count:1,delivery_status:'UNKNOWN'});});

it('does not resend accepted Push after delivery-history failure on the next invocation',async()=>{const r=await run(false,true,false,2);expect(r.order.filter(x=>x==='PUSH')).toHaveLength(1);});
it('does not resend after a transport timeout on the next invocation',async()=>{const r=await run(false,false,true,2);expect(r.order.filter(x=>x==='PUSH')).toHaveLength(1);});
it('does not resend after the transport result cannot be saved',async()=>{const r=await run(false,false,false,2,true);expect(r.order.filter(x=>x==='PUSH')).toHaveLength(1);});
it('does not resend if watch state persistence fails after accepted Push',async()=>{const r=await run(false,false,false,2,false,true);expect(r.order.filter(x=>x==='PUSH')).toHaveLength(1);});

it('the real worker suppresses continued actionable forecasts despite a saturated dry streak',async()=>{const r=await run(false,false,false,2,false,false,true);expect(r.order.filter(x=>x==='PUSH')).toHaveLength(0);expect(r.body.results[0].suppressionReason).toBe('FORECAST_EPISODE_ALREADY_NOTIFIED');});
