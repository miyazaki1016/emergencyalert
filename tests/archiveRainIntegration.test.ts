import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {areaPlan,areaKey} from '../supabase/functions/_shared/rainArea';
import {makeSnapshot,timestamp,jmaTime} from '../supabase/functions/_shared/rainReplay';
async function run(options:{writeError?:boolean;probe?:boolean;unauthorized?:boolean}={}){
 let handler:any,captures=0;const writes:Array<{table:string;op:string;value:any}>=[];
 const current=Math.floor(Date.now()/300000)*300000,target=current+15*60000;
 const snapshot=makeSnapshot({eventType:'RAIN_ENDING',decidedAt:new Date().toISOString(),latitude:35.66,longitude:139.82,title:'',body:'',rain:{event:{endingAt:jmaTime(target)},observation:[{baseTime:jmaTime(current),validTime:jmaTime(current)}],forecast:[{baseTime:jmaTime(current),validTime:jmaTime(target)}]},previousState:null})!;
 const row={id:'evaluation',snapshot,expires_at:new Date(Date.now()+86400000).toISOString(),deadline_at:new Date(Date.now()+60*60000).toISOString(),image_attempts:1,image_lease_id:'lease'};
 const db={async rpc(name:string){return {data:name==='claim_rain_image_jobs'?[row]:65536,error:null};},from(table:string){let op='select',value:any;const chain:any={};for(const method of ['select','single','eq','lt'])chain[method]=()=>chain;for(const method of ['insert','update','upsert','delete'])chain[method]=(v:any)=>{op=method;value=v;writes.push({table,op,value});return chain;};chain.then=(resolve:any,reject:any)=>{let result:any={data:null,error:null};if(table==='rain_image_runs'&&op==='insert')result.data={id:1};if(table==='rain_evaluation_images'&&op==='select')result.data=[];if(table==='rain_evaluation_images'&&op==='upsert'&&options.writeError)result.error=Error('db');if(table==='rain_image_runs'&&op==='update'&&value.probe_png)result.data={probe_png:value.probe_png};return Promise.resolve(result).then(resolve,reject);};return chain;}};
 const image={png:new Uint8Array([137,80,78,71,13,10,26,10]),mask:new Uint8Array(9).fill(1),complete:true,metadata:{window:{width:3,height:3},pngSha256:'hash'}};
 const source=readFileSync('supabase/functions/archive-rain/index.ts','utf8').replace(/^import .*;\n/gm,'');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('createClient','Buffer','areaPlan','areaKey','captureArea','sha256','observationIndex','timestamp','Deno',code)(()=>db,Buffer,areaPlan,areaKey,async()=>{captures++;return image;},async()=> 'hash',async()=>new Set([jmaTime(current)]),timestamp,{env:{get:()=> 'config'},serve:(fn:any)=>handler=fn});
 const response=await handler(new Request('https://test.invalid',{method:'POST',headers:{'x-watch-token':options.unauthorized?'wrong':'config'},body:JSON.stringify(options.probe?{mode:'probe'}:{})}));
 return {response,body:await response.json(),writes,captures};
}
it('archives original forecast and available observations separately in private bytea rows',async()=>{const r=await run();expect(r.response.status).toBe(200);expect(r.body.saved).toBeGreaterThan(0);const images=r.writes.filter(x=>x.table==='rain_evaluation_images'&&x.op==='upsert');expect(images.some(x=>x.value.frame_kind==='FORECAST')).toBe(true);expect(images.every(x=>x.value.crop_png.startsWith('\\x89504e47'))).toBe(true);expect(r.writes.find(x=>x.table==='rain_notification_evaluations')?.value).toMatchObject({image_state:'PENDING',image_lease_id:null});});
it('exposes database write failure as a failed run and releases the image lease',async()=>{const r=await run({writeError:true});expect(r.response.status).toBe(500);expect(r.body.failures).toBe(1);expect(r.writes.find(x=>x.table==='rain_notification_evaluations')?.value).toMatchObject({image_error:'IMAGE_WRITE_FAILED',image_lease_id:null});});
it('probes image bytea roundtrip without creating notification/evaluation fixtures',async()=>{const r=await run({probe:true});expect(r.body.byteaRoundTrip).toBe(true);expect(r.body.probe).toBe(true);expect(r.writes.every(x=>x.table==='rain_image_runs')).toBe(true);});
it('rejects unauthorized requests before touching data or JMA',async()=>{const r=await run({unauthorized:true});expect(r.response.status).toBe(401);expect(r.writes).toHaveLength(0);expect(r.captures).toBe(0);});
