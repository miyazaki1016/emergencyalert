import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {SHADOW_VERSION,compareShadow,type Feature} from '../_shared/areaShadow.ts';
import {analyzeImage} from '../_shared/areaShadowImage.ts';
import type {Snapshot,Evidence} from '../_shared/rainReplay.ts';
Deno.serve(async(req:Request)=>{
 const token=Deno.env.get('WATCH_CRON_TOKEN');if(!token||req.headers.get('x-watch-token')!==token)return Response.json({error:'unauthorized'},{status:401});
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return Response.json({error:'server_config'},{status:500});
 const db=createClient(url,key,{auth:{persistSession:false}}),started=Date.now(),body=await req.json().catch(()=>({})),probe=body?.mode==='probe';
 const run=await db.from('rain_shadow_runs').insert({mode:probe?'PROBE':'REGULAR',status:'RUNNING'}).select('id').single();if(run.error)return Response.json({error:'SHADOW_RUN_FAILED'},{status:500});
 let claimed=0,computed=0,failures=0,complete=0,incomplete=0;
 try{
  if(probe){
   const source=await db.from('rain_image_runs').select('id,probe_png,probe_mask,probe_metadata').eq('mode','PROBE').eq('status','OK').order('id',{ascending:false}).limit(1).single();
   if(source.error||!source.data?.probe_png)throw Error('SHADOW_PROBE_IMAGE_MISSING');
   const metrics=await analyzeImage(source.data.probe_png,source.data.probe_mask,source.data.probe_metadata,{latitude:35.66,longitude:139.82});
   const summary={probe:true,sourceImageRunId:source.data.id,sourceValidTime:source.data.probe_metadata.validTime,sourceCapturedAt:source.data.probe_metadata.capturedAt,version:SHADOW_VERSION,metrics};
   const done=await db.from('rain_shadow_runs').update({status:'OK',finished_at:new Date().toISOString(),summary}).eq('id',run.data.id);if(done.error)throw Error('SHADOW_PROBE_SAVE_FAILED');
   return Response.json({ok:true,...summary});
  }
  const jobs=await db.rpc('claim_rain_shadow_jobs',{batch_size:2});if(jobs.error)throw Error('SHADOW_CLAIM_FAILED');claimed=jobs.data?.length??0;
  for(const row of jobs.data??[]){
   try{
    if(Date.now()-started>40000)throw Error('SHADOW_RUN_BUDGET');
    const snapshot=row.snapshot as Snapshot;
    const images=await db.from('rain_evaluation_images').select('frame_kind,base_time,valid_time,crop_png,availability_mask,metadata').eq('evaluation_id',row.id).limit(20);if(images.error)throw Error('SHADOW_IMAGE_QUERY_FAILED');
    const features:Feature[]=[],imageErrors:Array<{kind:string;validTime:string;reason:string}>=[];
    for(const image of images.data??[]){
     try{
      if(Date.now()-started>40000)throw Error('SHADOW_RUN_BUDGET');
      if(image.metadata.kind!==image.frame_kind||image.metadata.baseTime!==image.base_time||image.metadata.validTime!==image.valid_time)throw Error('SHADOW_IMAGE_IDENTITY');
      const metrics=await analyzeImage(image.crop_png,image.availability_mask,image.metadata,snapshot.location);
      features.push({kind:image.frame_kind,baseTime:image.base_time,validTime:image.valid_time,pngSha256:image.metadata.pngSha256,matchesInputPixel:image.metadata.matchesInputPixel??null,capturedAt:image.metadata.capturedAt,metrics});
     }catch(e){imageErrors.push({kind:image.frame_kind,validTime:image.valid_time,reason:(e as Error).message});}
    }
    const comparison=compareShadow(snapshot,features,Array.isArray(row.evidence)?row.evidence as Evidence[]:[],row.radar_result,Date.now());
    const saved=await db.from('rain_area_shadow_results').upsert({evaluation_id:row.id,algorithm_version:SHADOW_VERSION,features,comparison:{...comparison,imageErrors},computed_at:new Date().toISOString(),expires_at:row.expires_at},{onConflict:'evaluation_id,algorithm_version'});if(saved.error)throw Error('SHADOW_RESULT_WRITE_FAILED');
    computed++;
    const finished=row.image_state!=='PENDING'&&row.state!=='PENDING',expired=Date.now()>=Date.parse(row.deadline_at)+20*60000||row.shadow_attempts>=24;
    const state=finished&&row.image_state==='COMPLETE'&&!imageErrors.length?'COMPLETE':finished||expired?'INCOMPLETE':'PENDING';
    if(state==='COMPLETE')complete++;if(state==='INCOMPLETE')incomplete++;
    const update=await db.from('rain_notification_evaluations').update({shadow_state:state,shadow_error:imageErrors.length?'SHADOW_IMAGE_ERRORS':null,shadow_next_attempt_at:new Date(Date.now()+5*60000).toISOString(),shadow_lease_id:null,shadow_leased_until:null}).eq('id',row.id).eq('shadow_lease_id',row.shadow_lease_id);if(update.error)throw Error('SHADOW_STATE_FAILED');
   }catch(e){failures++;const recover=await db.from('rain_notification_evaluations').update({shadow_error:(e as Error).message,shadow_next_attempt_at:new Date(Date.now()+5*60000).toISOString(),shadow_lease_id:null,shadow_leased_until:null,...(row.shadow_attempts>=24?{shadow_state:'INCOMPLETE'}:{})}).eq('id',row.id).eq('shadow_lease_id',row.shadow_lease_id);if(recover.error)console.warn('[rain-shadow] recovery_write_failed');}
  }
  const cleanup=await db.from('rain_area_shadow_results').delete().lt('expires_at',new Date().toISOString());if(cleanup.error)throw Error('SHADOW_RETENTION_FAILED');
  const runs=await db.from('rain_shadow_runs').delete().lt('started_at',new Date(Date.now()-30*86400000).toISOString());if(runs.error)throw Error('SHADOW_RUN_RETENTION_FAILED');
  const capacity=await db.rpc('rain_shadow_storage_bytes');if(capacity.error)throw Error('SHADOW_CAPACITY_FAILED');
  const summary={version:SHADOW_VERSION,claimed,computed,failures,complete,incomplete,storageBytes:capacity.data,budgetBlocked:Number(capacity.data)>=33554432};
  const done=await db.from('rain_shadow_runs').update({status:failures?'ERROR':'OK',finished_at:new Date().toISOString(),summary}).eq('id',run.data.id);if(done.error)throw Error('SHADOW_FINISH_FAILED');
  return Response.json({ok:!failures,...summary},{status:failures?500:200});
 }catch(e){await db.from('rain_shadow_runs').update({status:'ERROR',finished_at:new Date().toISOString(),summary:{error:(e as Error).message,claimed,computed,failures}}).eq('id',run.data.id);return Response.json({error:(e as Error).message},{status:500});}
});
