import {describe,it,expect,vi} from "vitest";
import {runIsolatedBatch,type IsolatedClaim,type IsolatedPort} from "./isolated-batch-238";

const item=(id:number):IsolatedClaim=>({
 claimed_id:id,claimed_prefecture:"hiroshima",claimed_source_id:"hiroshima-person:"+id,
 claimed_recipient:"kishibojim@gmail.com"
});
function fixture(count:number){
 const queue=Array.from({length:count},(_,i)=>item(i+1));
 const finish=vi.fn(async()=>true);
 const claim=vi.fn(async(n:number)=>{expect(n).toBe(1);return queue.length?[queue.shift()!]:[];});
 const port:IsolatedPort={claim,finish,mailFor:async c=>({subject:"試験"+c.claimed_id,body:"隔離試験"})};
 return {port,claim,finish,queue};
}
const ok=vi.fn(async()=>new Response(JSON.stringify({id:"gmail_test_238"}),{status:200}));
describe("Issue 238 isolated batch runner",()=>{
 it("sends at most ten, claims one at a time and persists each outcome",async()=>{
   const f=fixture(12);const request=vi.fn(ok);
   expect(await runIsolatedBatch(f.port,"fake-token",request as typeof fetch)).toEqual({claimed:10,sent:10,failed:0,unknown:0,stopped:false});
   expect(f.queue).toHaveLength(2);
   expect(f.finish).toHaveBeenCalledTimes(10);
   expect(request).toHaveBeenCalledTimes(10);
 });
 it("stops after uncertain response, leaving other candidates unclaimed",async()=>{
   const f=fixture(5);const request=vi.fn(async()=>{throw Error("timeout")});
   expect(await runIsolatedBatch(f.port,"fake-token",request as typeof fetch)).toEqual({claimed:1,sent:0,failed:0,unknown:1,stopped:true});
   expect(f.queue).toHaveLength(4);expect(f.finish).toHaveBeenCalledWith(1,"UNKNOWN",null);
   expect(request).toHaveBeenCalledTimes(1);
 });
 it("stops if outcome persistence fails",async()=>{
   const f=fixture(4);f.port.finish=async()=>false;
   const request=vi.fn(ok);
   await expect(runIsolatedBatch(f.port,"fake-token",request as typeof fetch)).rejects.toThrow("ISOLATED_OUTCOME_NOT_PERSISTED");
   expect(request).toHaveBeenCalledTimes(1);expect(f.queue).toHaveLength(3);
 });
 it("rejects any production recipient before calling Gmail",async()=>{
   const f=fixture(2);f.port.claim=async()=>[{...item(1),claimed_recipient:"getter01@jaspic-nes.net"}];
   const request=vi.fn(ok);
   await expect(runIsolatedBatch(f.port,"fake-token",request as typeof fetch)).rejects.toThrow("ISOLATED_CLAIM_INVALID");
   expect(request).not.toHaveBeenCalled();
 });
 it("rejects more than ten and no token",async()=>{
   const f=fixture(12);
   await expect(runIsolatedBatch(f.port,"fake-token",ok as typeof fetch,11)).rejects.toThrow();
   await expect(runIsolatedBatch(f.port,"",ok as typeof fetch)).rejects.toThrow();
   expect(f.queue).toHaveLength(12);
 });
});
