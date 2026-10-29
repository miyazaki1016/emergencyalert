import {it,expect} from 'vitest';
import {centerPixelLabel,groundAt,summarize,validateGroundReport,imageDataUrl,type ImageRow,type LabData,type GroundReport,type Shadow} from '../lib/research/rainLab';
const valid='20261029031000',time='2026-10-29T03:10:00Z',now=Date.parse('2026-10-29T04:00:00Z');
const report:GroundReport={evaluation_id:'case',observed_at:time,weather:'RAIN',report_source:'AT_LOCATION',location_confirmed:true,note:''};
function fixture():LabData{
 const series=(state:'RAIN'|'NO_RAIN'|'INDETERMINATE')=>({series:[{validTime:valid,state}],scores:[{validTime:valid,predicted:state,actual:'RAIN' as const,verdict:state==='INDETERMINATE'?'INDETERMINATE':state==='RAIN'?'MATCH':'MISMATCH'}]});
 const shadow:Shadow={evaluation_id:'case',algorithm_version:'area-shadow-v1',features:[],computed_at:time,comparison:{groups:[{baseTime:'20261029030000',point:series('NO_RAIN'),variants:[{threshold:.4,area:series('RAIN'),combined:series('RAIN')}]}]}};
 return {evaluations:[{id:'case',target_id:'place',event_type:'RAIN_ENDING',target_time:time,created_at:'2026-10-29T03:01:00Z',notification_id:1,state:'COMPLETE',image_state:'COMPLETE',shadow_state:'COMPLETE',snapshot:{decidedAt:'2026-10-29T03:01:00Z',location:{latitude:35.6,longitude:139.8}}}],total:1,shadows:[shadow],reports:[report],targets:[{id:'place',label:'テスト地点'}],feedback:[],health:{observation:null,radar:null,images:null,shadow:null},probe:null};
}
it('does not manufacture an accuracy percentage from no data',()=>{const f=fixture();f.evaluations=[];const s=summarize(f,.4,'ground',now);expect(s.paired).toBe(0);expect(s.caseCount).toBe(0);expect(s.totals.point.matched).toBe(0);});
it('pairs all methods against the same direct observation',()=>{const s=summarize(fixture(),.4,'ground',now);expect(s.paired).toBe(1);expect(s.caseCount).toBe(1);expect(s.totals.point.falseDry).toBe(1);expect(s.totals.area.matched).toBe(1);expect(s.totals.combined.matched).toBe(1);});
it('keeps nearby references, unconfirmed locations and unknown reports out of ground truth',()=>{for(const patch of [{report_source:'NEARBY_REFERENCE' as const},{location_confirmed:false},{weather:'UNKNOWN' as const}])expect(groundAt([{...report,...patch}],'case',valid,now)).toBe('INDETERMINATE');});
it('rejects future and time-distant reports and does not join another case',()=>{expect(groundAt([report],'case',valid,0)).toBe('INDETERMINATE');expect(groundAt([report],'other',valid,now)).toBe('INDETERMINATE');expect(groundAt([{...report,observed_at:'2026-10-29T03:13:00Z'}],'case',valid,now)).toBe('INDETERMINATE');});
it('does not silently pick a convenient value from conflicting reports',()=>{expect(groundAt([report,{...report,weather:'NO_RAIN',observed_at:'2026-10-29T03:11:00Z'}],'case',valid,now)).toBe('INDETERMINATE');});
it('separates radar agreement from ground observation agreement',()=>{const f=fixture();f.reports=[];expect(summarize(f,.4,'ground',now).paired).toBe(0);expect(summarize(f,.4,'radar',now).paired).toBe(1);});
it('shows abstentions but excludes them from the common denominator',()=>{const f=fixture();f.shadows[0].comparison.groups[0].variants[0].combined.series[0].state='INDETERMINATE';const s=summarize(f,.4,'ground',now);expect(s.paired).toBe(0);expect(s.totals.combined.abstained).toBe(1);expect(s.totals.area.matched).toBe(0);});
it('does not score pending or not-yet-valid cases',()=>{const f=fixture();f.evaluations[0].shadow_state='PENDING';expect(summarize(f,.4,'ground',now).paired).toBe(0);f.evaluations[0].shadow_state='COMPLETE';expect(summarize(f,.4,'ground',0).paired).toBe(0);});
it('requires explicit input and location confirmation before saving observations',()=>{expect(validateGroundReport({...report,location_confirmed:false},now)).not.toBeNull();expect(validateGroundReport({...report,observed_at:'2030-01-01T00:00:00Z'},now)).not.toBeNull();expect(validateGroundReport({...report,note:'x'.repeat(301)},now)).not.toBeNull();expect(validateGroundReport(report,now)).toBeNull();});
it('accepts only bounded PNG bytea for image rendering',()=>{expect(imageDataUrl('javascript:alert(1)')).toBeNull();expect(imageDataUrl('\\x89504e47f')).toBeNull();expect(imageDataUrl('\\x89504e470d0a1a0a')).toMatch(/^data:image\/png;base64,/);});

it('distinguishes faint opaque rain, acquired transparency, unknown and missing center pixels',()=>{
 const row={availability_mask:'\\x01',metadata:{centerRgba:{r:242,g:242,b:255,a:255}}} as ImageRow;
 expect(centerPixelLabel(row,0)).toBe('雨色（1mm/h未満）');
 row.metadata.centerRgba={r:255,g:255,b:255,a:0};expect(centerPixelLabel(row,0)).toMatch(/^取得済み透明/);
 row.metadata.centerRgba={r:1,g:2,b:3,a:255};expect(centerPixelLabel(row,0)).toBe('未知色（判定保留）');
 row.availability_mask='\\x00';expect(centerPixelLabel(row,0)).toMatch(/^未取得/);
 row.availability_mask='\\x01';expect(centerPixelLabel(row,10)).toBe('取得状態を確認できない');
});

it('explains zero ground pairs independently from radar pairs and area exclusions',()=>{const f=fixture();f.reports=[];expect(summarize(f,.4,'ground',now).exclusions.GROUND_UNCONFIRMED).toBe(1);expect(summarize(f,.4,'radar',now).paired).toBe(1);f.shadows[0].comparison.groups[0].variants[0].area.series[0]={validTime:valid,state:'INDETERMINATE',reason:'COARSE_SOURCE_HORIZON'};expect(summarize(f,.4,'radar',now).exclusions.COARSE_SOURCE_HORIZON).toBe(1);expect(summarize(f,.4,'radar',now).paired).toBe(0);});
