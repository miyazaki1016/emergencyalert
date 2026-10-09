import {test,expect} from 'vitest';
import {processDeadlineProofJobs} from './national-deadline-worker';
import type {SupabaseClient} from '@supabase/supabase-js';
test('deadline proof never claims without batch and final reserve',async()=>{
 let claims=0;
 const client={rpc:async()=>{claims++;return {data:[],error:null}}} as unknown as SupabaseClient;
 const r=await processDeadlineProofJobs(client,{budgetMs:23000,now:()=>0});
 expect(claims).toBe(0);expect(r.claimed).toBe(0);
});
test('aborted invocation leaves queue unclaimed',async()=>{
 const controller=new AbortController(); controller.abort();
 const client={rpc:async()=>{throw new Error('must not claim')}} as unknown as SupabaseClient;
 expect((await processDeadlineProofJobs(client,{signal:controller.signal})).claimed).toBe(0);
});
test('in-flight timeout defers claimed work without publishing a result',async()=>{
 const controller=new AbortController();let claims=0,defers=0,finishes=0;
 const client={rpc:async(name:string)=>{
  if(name==='claim_national_rain_refinement_jobs')return {data:claims++?[]:[{id:1,run_key:'p',basetime:'20260930060000',validtime:'20260930060500',zoom:8,tile_x:228,tile_y:97}],error:null};
  if(name==='defer_national_rain_refinement_job')defers++;
  if(name==='finish_national_rain_refinement_job')finishes++;
  return {data:null,error:null};
 },from:()=>{throw new Error('must not publish')}} as unknown as SupabaseClient;
 const r=await processDeadlineProofJobs(client,{signal:controller.signal,fetcher:async()=>{controller.abort();throw new Error('aborted')}});
 expect(r.deferred).toBe(1);expect(defers).toBe(1);expect(finishes).toBe(0);expect(r.done).toBe(0);
});
