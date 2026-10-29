import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {Buffer} from 'node:buffer';
import {areaPlan,areaKey,type AreaRequest} from '../_shared/rainArea.ts';
import {captureArea,sha256,type TileCache} from '../_shared/replayAreaReader.ts';
import {observationIndex} from '../_shared/replayJma.ts';
import {timestamp,type Snapshot} from '../_shared/rainReplay.ts';
const hex=(bytes:Uint8Array)=>'\\x'+Buffer.from(bytes).toString('hex');
Deno.serve(async(req:Request)=>{
 const token=Deno.env.get('WATCH_CRON_TOKEN');
 if(!token||req.headers.get('x-watch-token')!==token)return Response.json({error:'unauthorized'},{status:401});
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return Response.json({error:'server_config'},{status:500});
 const db=createClient(url,key,{auth:{persistSession:false}}),started=Date.now();
 const body=await req.json().catch(()=>({}));const probe=body.mode==='probe';
 const run=await db.from('rain_image_runs').insert({mode:probe?'PROBE':'REGULAR',status:'RUNNING'}).select('id').single();
 if(run.error)return Response.json({error:'IMAGE_RUN_RECORD_FAILED'},{status:500});
 let claimed=0,saved=0,partial=0,failures=0,complete=0,incomplete=0,frameErrors=0;
 try{
  if(probe){
   const index=await observationIndex(),latest=[...index].sort().at(-1)!;
   const image=await captureArea({location:{latitude:35.66,longitude:139.82},decidedAt:new Date().toISOString()} as Snapshot,{kind:'OBSERVATION',baseTime:latest,validTime:latest,inputRgba:null},index);
   const stored=await db.from('rain_image_runs').update({probe_png:hex(image.png),probe_mask:hex(image.mask),probe_metadata:image.metadata}).eq('id',run.data.id).select('probe_png').single();
   if(stored.error||!stored.data)throw Error('PROBE_WRITE_FAILED');
   const read=Buffer.from(String(stored.data.probe_png).replace(/^\\x/,''),'hex');
   if(await sha256(read)!==image.metadata.pngSha256)throw Error('PROBE_ROUNDTRIP_MISMATCH');
   const summary={probe:true,latest,complete:image.complete,pngBytes:image.png.length,maskBytes:image.mask.length,byteaRoundTrip:true,window:image.metadata.window,pngSha256:image.metadata.pngSha256};
   const done=await db.from('rain_image_runs').update({status:'OK',finished_at:new Date().toISOString(),summary}).eq('id',run.data.id);
   if(done.error)throw Error('PROBE_FINISH_FAILED');
   return Response.json({ok:true,...summary});
  }
  const jobs=await db.rpc('claim_rain_image_jobs',{batch_size:2});if(jobs.error)throw Error('IMAGE_CLAIM_FAILED');
  claimed=jobs.data?.length??0;
  let index=new Set<string>(),indexError:string|null=null;
  if(claimed){try{index=await observationIndex();}catch(e){indexError=(e as Error).message;}}
  const cache:TileCache=new Map();
  for(const row of jobs.data??[]){
   let lastError=indexError;
   try{
    const snapshot=row.snapshot as Snapshot,plan=areaPlan(snapshot);
    const previous=await db.from('rain_evaluation_images').select('frame_kind,base_time,valid_time,complete').eq('evaluation_id',row.id);
    if(previous.error)throw Error('IMAGE_LIST_FAILED');
    const completed=new Set((previous.data??[]).filter(x=>x.complete).map(x=>`${x.frame_kind}/${x.base_time}/${x.valid_time}`));
    let attempted=0;
    for(const request of plan){
     if(Date.now()-started>=40000||attempted>=6)break;
     if(completed.has(areaKey(request)))continue;
     if(request.kind!=='FORECAST'&&(timestamp(request.validTime)!>Date.now()||!index.has(request.validTime)))continue;
     attempted++;
     try{
      const image=await captureArea(snapshot,request,index,cache);
      const window=image.metadata.window as {width:number;height:number};
      const savedResult=await db.from('rain_evaluation_images').upsert({evaluation_id:row.id,frame_kind:request.kind,base_time:request.baseTime,valid_time:request.validTime,width:window.width,height:window.height,crop_png:hex(image.png),availability_mask:hex(image.mask),complete:image.complete,metadata:image.metadata,expires_at:row.expires_at},{onConflict:'evaluation_id,frame_kind,base_time,valid_time'});
      if(savedResult.error)throw Error('IMAGE_WRITE_FAILED');
      saved++;if(!image.complete)partial++;else completed.add(areaKey(request));
     }catch(e){lastError=(e as Error).message;if(lastError==='IMAGE_WRITE_FAILED')throw e;frameErrors++;}
    }
    const all=plan.length>0&&plan.every(request=>completed.has(areaKey(request)));
    const expired=Date.now()>=Date.parse(row.deadline_at)+10*60000||row.image_attempts>=60;
    const state=all?'COMPLETE':expired||!plan.length?'INCOMPLETE':'PENDING';
    if(state==='COMPLETE')complete++;if(state==='INCOMPLETE')incomplete++;
    const update=await db.from('rain_notification_evaluations').update({image_state:state,image_error:lastError,image_next_attempt_at:new Date(Date.now()+60000).toISOString(),image_lease_id:null,image_leased_until:null}).eq('id',row.id).eq('image_lease_id',row.image_lease_id);
    if(update.error)throw Error('IMAGE_STATE_WRITE_FAILED');
   }catch(e){failures++;const recover=await db.from('rain_notification_evaluations').update({image_error:(e as Error).message,image_next_attempt_at:new Date(Date.now()+60000).toISOString(),image_lease_id:null,image_leased_until:null}).eq('id',row.id).eq('image_lease_id',row.image_lease_id);if(recover.error)console.warn('[rain-area] recovery_write_failed');}
  }
  const cleanup=await db.from('rain_evaluation_images').delete().lt('expires_at',new Date().toISOString());if(cleanup.error)throw Error('IMAGE_RETENTION_FAILED');
  const cleanRuns=await db.from('rain_image_runs').delete().lt('started_at',new Date(Date.now()-30*86400000).toISOString());if(cleanRuns.error)throw Error('IMAGE_RUN_RETENTION_FAILED');
  const capacity=await db.rpc('rain_image_storage_bytes');if(capacity.error)throw Error('IMAGE_CAPACITY_FAILED');
  const summary={claimed,saved,partial,frameErrors,failures,complete,incomplete,storageBytes:capacity.data,budgetBlocked:Number(capacity.data)>=33554432};
  const finish=await db.from('rain_image_runs').update({status:failures?'ERROR':'OK',finished_at:new Date().toISOString(),summary}).eq('id',run.data.id);if(finish.error)throw Error('IMAGE_FINISH_FAILED');
  return Response.json({ok:!failures,...summary},{status:failures?500:200});
 }catch(e){await db.from('rain_image_runs').update({status:'ERROR',finished_at:new Date().toISOString(),summary:{probe,error:(e as Error).message,claimed,saved,failures}}).eq('id',run.data.id);return Response.json({error:(e as Error).message},{status:500});}
});
