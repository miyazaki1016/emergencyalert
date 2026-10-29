import type {SupabaseClient} from '@supabase/supabase-js';
import {validateGroundReport,type Evaluation,type GroundReport,type Health,type ImageRow,type LabData,type Shadow} from './rainLab';
export class LabAccessError extends Error {constructor(public reason:'SESSION'|'FORBIDDEN'){super(reason);}}
export async function requireResearchAccess(client:SupabaseClient){
 const user=await client.auth.getUser();if(user.error||!user.data.user)throw new LabAccessError('SESSION');
 const membership=await client.from('rain_research_admins').select('owner_id').eq('owner_id',user.data.user.id).eq('enabled',true).maybeSingle();
 if(membership.error)throw Error('権限の確認に失敗しました。');if(!membership.data)throw new LabAccessError('FORBIDDEN');return user.data.user.id;
}
function check<T>(r:{data:T|null;error:unknown},message:string):T{if(r.error||r.data===null)throw Error(message);return r.data;}
export async function loadLab(client:SupabaseClient,days:number):Promise<LabData>{
 const owner=await requireResearchAccess(client);const since=new Date(Date.now()-Math.min(90,Math.max(1,days))*86400000).toISOString();
 const [events,targets,radar,images,shadow,diagnostic,probe]=await Promise.all([
  client.from('rain_notification_evaluations').select('id,target_id,event_type,target_time,created_at,notification_id,state,image_state,shadow_state,delivery_record_status,attempts,image_attempts,shadow_attempts,deadline_at,last_error,image_error,shadow_error,radar_result,snapshot',{count:'exact'}).eq('owner_id',owner).gt('accepted_count',0).gte('created_at',since).order('created_at',{ascending:false}).limit(100),
  client.from('watch_targets').select('id,label').eq('owner_id',owner),
  client.from('rain_evaluation_runs').select('started_at,finished_at,status,summary').order('id',{ascending:false}).limit(1),
  client.from('rain_image_runs').select('started_at,finished_at,status,summary,mode').eq('mode','REGULAR').order('id',{ascending:false}).limit(1),
  client.from('rain_shadow_runs').select('started_at,finished_at,status,summary,mode').eq('mode','REGULAR').order('id',{ascending:false}).limit(1),
  client.from('rain_diagnostic_history').select('checked_at,current_status,source_valid_at,target_id').order('checked_at',{ascending:false}).limit(1),
  client.from('rain_image_runs').select('probe_png,probe_mask,probe_metadata,summary').eq('mode','PROBE').eq('status','OK').order('id',{ascending:false}).limit(1),
 ]);
 const evaluations=check(events,'比較ケースの取得に失敗しました。') as Evaluation[],ownTargets=check(targets,'登録地点を取得できません。');
 const ids=evaluations.map(e=>e.id),notificationIds=evaluations.map(e=>e.notification_id).filter((id):id is number=>id!==null);
 const [results,reports,feedback]=ids.length?await Promise.all([
  client.from('rain_area_shadow_results').select('evaluation_id,algorithm_version,features,comparison,computed_at').in('evaluation_id',ids).eq('algorithm_version','area-shadow-v1'),
  client.from('rain_research_ground_reports').select('evaluation_id,observed_at,weather,report_source,location_confirmed,note,updated_at').in('evaluation_id',ids).order('observed_at',{ascending:false}),
  notificationIds.length?client.from('rain_notification_feedback').select('notification_id,actual_weather,observed_at,observed_time_source').in('notification_id',notificationIds):Promise.resolve({data:[],error:null}),
 ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null}];
 for(const result of [radar,images,shadow,diagnostic,probe])if(result.error)throw Error('稼働状況の取得に失敗しました。');
 const old=probe.data?.[0],meta=old?.probe_metadata;
 return {evaluations,total:events.count??evaluations.length,targets:ownTargets,shadows:check(results,'比較結果を取得できません。') as Shadow[],reports:check(reports,'地点での確認記録を取得できません。') as GroundReport[],feedback:check(feedback,'天気回答を取得できません。'),health:{observation:diagnostic.data?.[0]?{started_at:diagnostic.data[0].checked_at,status:['RAIN','NO_RAIN'].includes(diagnostic.data[0].current_status)?'OK':'UNKNOWN'}:null,radar:radar.data?.[0] as Health??null,images:images.data?.[0] as Health??null,shadow:shadow.data?.[0] as Health??null},probe:old?.probe_png&&meta?{sourceValidTime:String(meta.validTime),image:{frame_kind:'OBSERVATION',base_time:meta.baseTime,valid_time:meta.validTime,crop_png:old.probe_png,availability_mask:old.probe_mask,width:meta.window.width,height:meta.window.height,complete:old.summary?.complete===true,metadata:meta}}:null};
}
export async function loadCaseImages(client:SupabaseClient,id:string):Promise<ImageRow[]>{await requireResearchAccess(client);const r=await client.from('rain_evaluation_images').select('frame_kind,base_time,valid_time,crop_png,availability_mask,width,height,complete,metadata').eq('evaluation_id',id).order('valid_time').limit(20);return check(r,'画像の取得に失敗しました。') as ImageRow[];}
export async function saveGround(client:SupabaseClient,report:GroundReport){const error=validateGroundReport(report);if(error)throw Error(error);const owner=await requireResearchAccess(client);const r=await client.from('rain_research_ground_reports').upsert({...report,owner_id:owner},{onConflict:'evaluation_id,observed_at'});if(r.error)throw Error('観測を保存できませんでした。権限と入力を確認してください。');}
