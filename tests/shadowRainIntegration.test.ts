import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {SHADOW_VERSION,compareShadow,measureArea} from '../supabase/functions/_shared/areaShadow';
import {areaWindow} from '../supabase/functions/_shared/rainArea';
import {classifyRainPixel} from '../lib/weather/providers/jma/classifyPixel';
import {makeSnapshot} from '../supabase/functions/_shared/rainReplay';
async function run(options:{writeError?:boolean;probe?:boolean;unauthorized?:boolean}={}){
 let handler:any;const writes:Array<{table:string;op:string;value:any}>=[],location={latitude:35.66,longitude:139.82},w=areaWindow(location.latitude,location.longitude),metrics=measureArea(new Uint8Array(w.width*w.height*4),new Uint8Array(w.width*w.height).fill(1),w,location,classifyRainPixel);
 const snapshot=makeSnapshot({eventType:'RAIN_ENDING',decidedAt:'2026-10-29T02:00:00Z',latitude:35.66,longitude:139.82,title:'',body:'',rain:{event:{endingAt:'20261029021000'},forecast:[{baseTime:'20261029020000',validTime:'20261029021000',status:'NO_RAIN'}]},previousState:null})!;
 const row={id:'eval',snapshot,evidence:[],radar_result:{exact:'INDETERMINATE'},image_state:'COMPLETE',state:'COMPLETE',expires_at:'2027-01-01T00:00:00Z',deadline_at:'2026-10-29T03:00:00Z',shadow_attempts:1,shadow_lease_id:'lease'};
 const metadata={kind:'FORECAST',baseTime:'20261029020000',validTime:'20261029021000',capturedAt:'2026-10-29T02:01:00Z',matchesInputPixel:true,pngSha256:'hash'};
 const db={async rpc(name:string){return {data:name==='claim_rain_shadow_jobs'?[row]:65536,error:null};},from(table:string){let op='select',value:any;const chain:any={};for(const m of ['select','single','eq','lt','limit','order'])chain[m]=()=>chain;for(const m of ['insert','update','upsert','delete'])chain[m]=(v:any)=>{op=m;value=v;writes.push({table,op,value});return chain;};chain.then=(resolve:any,reject:any)=>{let result:any={data:null,error:null};if(table==='rain_shadow_runs'&&op==='insert')result.data={id:1};if(table==='rain_image_runs')result.data={id:1,probe_png:'png',probe_mask:'mask',probe_metadata:metadata};if(table==='rain_evaluation_images')result.data=[{frame_kind:'FORECAST',base_time:metadata.baseTime,valid_time:metadata.validTime,metadata,crop_png:'png',availability_mask:'mask'}];if(table==='rain_area_shadow_results'&&options.writeError)result.error=Error('DB');return Promise.resolve(result).then(resolve,reject);};return chain;}};
 const source=readFileSync('supabase/functions/shadow-rain/index.ts','utf8').replace(/^import .*;\n/gm,'');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('createClient','SHADOW_VERSION','compareShadow','analyzeImage','Deno',code)(()=>db,SHADOW_VERSION,compareShadow,async()=>metrics,{env:{get:()=> 'config'},serve:(fn:any)=>handler=fn});
 const response=await handler(new Request('https://test.invalid',{method:'POST',headers:{'x-watch-token':options.unauthorized?'wrong':'config'},body:JSON.stringify(options.probe?{mode:'probe'}:{})}));
 return {response,body:await response.json(),writes};
}
it('records experimental point/area/combined results without changing the production snapshot',async()=>{const r=await run();expect(r.response.status).toBe(200);const result=r.writes.find(x=>x.table==='rain_area_shadow_results')!.value;expect(result.comparison.experimental).toBe(true);expect(result.comparison.thresholds).toEqual([0.2,0.4,0.6]);expect(result.features).toHaveLength(1);const update=r.writes.find(x=>x.table==='rain_notification_evaluations')!.value;expect(update.shadow_state).toBe('COMPLETE');expect(update.snapshot).toBeUndefined();expect(update.radar_result).toBeUndefined();});
it('releases the shadow lease on result write failure and reports an error',async()=>{const r=await run({writeError:true});expect(r.response.status).toBe(500);expect(r.writes.find(x=>x.table==='rain_notification_evaluations')?.value).toMatchObject({shadow_error:'SHADOW_RESULT_WRITE_FAILED',shadow_lease_id:null});});
it('probe creates only a separate run record, not notification accuracy samples',async()=>{const r=await run({probe:true});expect(r.body.probe).toBe(true);expect(r.body.sourceValidTime).toBe('20261029021000');expect(r.writes.every(x=>x.table==='rain_shadow_runs')).toBe(true);});
it('rejects unauthenticated calls without DB writes',async()=>{const r=await run({unauthorized:true});expect(r.response.status).toBe(401);expect(r.writes).toHaveLength(0);});
