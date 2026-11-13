import {describe,it,expect,vi} from "vitest";
import {runVerifiedIsolatedFirstMail,type IsolatedVerifiedPort} from "./isolated-first-mail-238";
function fixture(){
 const h=Array.from({length:31},(_,i)=>"hiroshima-person:"+(45000+i));
 const s=Array.from({length:3},(_,i)=>"shiga-person:"+(3000+i));
 const preview={mode:"READ_ONLY",countsComplete:true,provinceErrors:[],total:34,provinces:[
 {province:"hiroshima",count:31,keys:h,details:h.map(key=>({key,classification:"NEW_ID"}))},
 {province:"shiga",count:3,keys:s,details:s.map(key=>({key,classification:"NEW_ID"}))}]};
 const staged=[...h.map(source_id=>({prefecture:"hiroshima" as const,source_id,recipient:"kishibojim@gmail.com",state:"PREPARED"})),...s.map(source_id=>({prefecture:"shiga" as const,source_id,recipient:"kishibojim@gmail.com",state:"PREPARED"}))];
 const claim=vi.fn(async()=>[{claimed_id:1,claimed_prefecture:"hiroshima" as const,claimed_source_id:h[0],claimed_recipient:"kishibojim@gmail.com"}]);
 const finish=vi.fn(async()=>true);
 const port:IsolatedVerifiedPort={freshPreview:async()=>preview,stagedRows:async()=>staged,claim,finish,mailFor:async()=>({subject:"隔離試験",body:"本文"})};
 const request=vi.fn(async()=>new Response(JSON.stringify({id:"test_238"}),{status:200}));
 return {port,claim,finish,request,preview,staged};
}
describe("Issue 238 first real mail preflight boundary",()=>{
 it("allows one mail only after 34 candidate match",async()=>{
  const f=fixture();
  expect(await runVerifiedIsolatedFirstMail(f.port,"mock-token",f.request as typeof fetch)).toEqual({claimed:1,sent:1,failed:0,unknown:0,stopped:false});
  expect(f.claim).toHaveBeenCalledExactlyOnceWith(1);
  expect(f.request).toHaveBeenCalledTimes(1);
  expect(f.finish).toHaveBeenCalledWith(1,"SENT","test_238");
 });
 it("rejects drift before any claim or Gmail call",async()=>{
  const f=fixture();f.staged[0].source_id="hiroshima-person:999999";
  await expect(runVerifiedIsolatedFirstMail(f.port,"mock-token",f.request as typeof fetch)).rejects.toThrow("ISOLATED_STAGED_MISMATCH");
  expect(f.claim).not.toHaveBeenCalled();expect(f.request).not.toHaveBeenCalled();
 });
 it("rejects a substituted claimed ID before sending Gmail",async()=>{
  const f=fixture();
  f.claim.mockResolvedValueOnce([{claimed_id:999,claimed_prefecture:"hiroshima",claimed_source_id:"hiroshima-person:999999",claimed_recipient:"kishibojim@gmail.com"}]);
  await expect(runVerifiedIsolatedFirstMail(f.port,"mock-token",f.request as typeof fetch)).rejects.toThrow("ISOLATED_CLAIM_NOT_IN_SNAPSHOT");
  expect(f.request).not.toHaveBeenCalled();
  // Claimed rows are deliberately not auto-reset: a human must reconcile the lock.
  expect(f.finish).not.toHaveBeenCalled();
 });
 it("rejects preview failure before claim",async()=>{
  const f=fixture();f.preview.countsComplete=false;
  await expect(runVerifiedIsolatedFirstMail(f.port,"mock-token",f.request as typeof fetch)).rejects.toThrow("PREVIEW_INCOMPLETE");
  expect(f.claim).not.toHaveBeenCalled();
 });
});
