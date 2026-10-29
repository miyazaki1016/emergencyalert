import { createClient } from 'jsr:@supabase/supabase-js@2';
import { evaluateReplay, requiredTimes, timestamp, type Evidence, type Snapshot } from '../_shared/rainReplay.ts';
import { observationIndex, readObservation } from '../_shared/replayJma.ts';

Deno.serve(async(req:Request)=>{
 const token=Deno.env.get('WATCH_CRON_TOKEN');
 if(!token||req.headers.get('x-watch-token')!==token)return Response.json({error:'unauthorized'},{status:401});
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return Response.json({error:'server_config'},{status:500});
 const db=createClient(url,key,{auth:{persistSession:false}});
 // Authenticated, read-only live-source probe. No simulated notification rows or Push.
 const requestBody=await req.json().catch(()=>({}));
 if(requestBody.mode==='probe'){
  try{
   const index=await observationIndex();const latest=[...index].sort().at(-1)!;
   const frame=await readObservation({location:{latitude:35.66,longitude:139.82}} as Snapshot,latest,index);
   return Response.json({ok:true,probe:true,indexFrames:index.size,latest,status:frame.status,capturedAt:frame.capturedAt});
  }catch(e){return Response.json({error:(e as Error).message,probe:true},{status:503});}
 }
 const started=Date.now();
 const run=await db.from('rain_evaluation_runs').insert({status:'RUNNING'}).select('id').single();
 if(run.error)return Response.json({error:'run_record_failed'},{status:500});
 let claimed=0,complete=0,indeterminate=0,collected=0,failures=0;
 try{
  // Two short leased jobs per invocation; existing notification worker is never called.
  const jobs=await db.rpc('claim_rain_evaluations',{batch_size:2});if(jobs.error)throw Error('CLAIM_FAILED');
  claimed=jobs.data?.length??0;
  let index:Set<string>|null=null,indexError:string|null=null;
  if(claimed){try{index=await observationIndex();}catch(e){indexError=(e as Error).message;}}
  const cache=new Map<string,Evidence>();
  for(const row of jobs.data??[]){
   const snapshot=row.snapshot as Snapshot;
   const evidence:Evidence[]=Array.isArray(row.evidence)?row.evidence:[];
   let lastError=indexError;
   try{
    const times=requiredTimes(snapshot);
    for(const validTime of times){
     if(Date.now()-started>45000) {lastError='RUN_BUDGET';break;}
     if(timestamp(validTime)!>Date.now()||!index?.has(validTime))continue;
     if(evidence.some(f=>f.validTime===validTime&&['RAIN','NO_RAIN'].includes(f.status??'')))continue;
     try{
      const cacheKey=`${snapshot.location.latitude}/${snapshot.location.longitude}/${validTime}`;
      const frame=cache.get(cacheKey)??await readObservation(snapshot,validTime,index);
      cache.set(cacheKey,frame);
      // Replace failed/unknown data only in later evidence, never the original snapshot.
      const old=evidence.findIndex(f=>f.validTime===validTime);if(old>=0)evidence[old]=frame;else evidence.push(frame);
      collected++;
     }catch(e){lastError=(e as Error).message;}
    }
    const result=evaluateReplay(snapshot,evidence,Date.now());
    const target=timestamp(snapshot.targetTime);
    const allCollected=times.length>0&&times.every(t=>evidence.some(f=>f.validTime===t&&['RAIN','NO_RAIN'].includes(f.status??'')));
    const ready=target===null||allCollected||Date.now()>=Date.parse(row.deadline_at)||row.attempts>=24;
    const state=ready?(result.exact==='INDETERMINATE'||result.within5==='INDETERMINATE'||result.within10==='INDETERMINATE'?'INDETERMINATE':'COMPLETE'):'PENDING';
    if(state==='COMPLETE')complete++;if(state==='INDETERMINATE')indeterminate++;
    const update=await db.from('rain_notification_evaluations').update({evidence,radar_result:result,state,last_error:lastError,next_attempt_at:new Date(Date.now()+5*60000).toISOString(),lease_id:null,leased_until:null}).eq('id',row.id).eq('lease_id',row.lease_id);
    if(update.error)throw Error('RESULT_WRITE_FAILED');
   }catch(e){failures++;const recovery=await db.from('rain_notification_evaluations').update({last_error:(e as Error).message,next_attempt_at:new Date(Date.now()+5*60000).toISOString(),lease_id:null,leased_until:null}).eq('id',row.id).eq('lease_id',row.lease_id);if(recovery.error)console.warn('[rain-replay] recovery_write_failed');}
  }
  // Bounded retention; deleting an account cascades its private evidence immediately.
  const cleanup=await db.from('rain_notification_evaluations').delete().lt('expires_at',new Date().toISOString());if(cleanup.error)throw Error('RETENTION_FAILED');
  const runsCleanup=await db.from('rain_evaluation_runs').delete().lt('started_at',new Date(Date.now()-30*86400000).toISOString());if(runsCleanup.error)throw Error('RUN_RETENTION_FAILED');
  const summary={claimed,complete,indeterminate,collected,failures};
  const finish=await db.from('rain_evaluation_runs').update({status:failures?'ERROR':'OK',finished_at:new Date().toISOString(),summary}).eq('id',run.data.id);
  if(finish.error)throw Error('HEARTBEAT_WRITE_FAILED');
  return Response.json({ok:!failures,...summary},{status:failures?500:200});
 }catch(e){
  await db.from('rain_evaluation_runs').update({status:'ERROR',finished_at:new Date().toISOString(),summary:{error:(e as Error).message,claimed,complete,indeterminate,collected,failures}}).eq('id',run.data.id);
  return Response.json({error:(e as Error).message},{status:500});
 }
});
