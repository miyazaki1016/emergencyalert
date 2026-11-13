import {describe,it,expect} from "vitest";
import {verifyIsolatedSendSnapshot,type StagedIsolatedRow} from "./isolated-send-gate-238";
function fixture(){
 const h=Array.from({length:31},(_,i)=>"hiroshima-person:"+(45000+i));
 const s=Array.from({length:3},(_,i)=>"shiga-person:"+(3000+i));
 const preview={
  mode:"READ_ONLY",countsComplete:true,provinceErrors:[],total:34,
  provinces:[
   {province:"hiroshima",count:31,keys:h,details:h.map(key=>({key,classification:"NEW_ID"}))},
   {province:"shiga",count:3,keys:s,details:s.map(key=>({key,classification:"NEW_ID"}))}
  ]
 };
 const staged:StagedIsolatedRow[]=[
  ...h.map(source_id=>({prefecture:"hiroshima" as const,source_id,recipient:"kishibojim@gmail.com",state:"PREPARED"})),
  ...s.map(source_id=>({prefecture:"shiga" as const,source_id,recipient:"kishibojim@gmail.com",state:"PREPARED"}))
 ];
 return {preview,staged};
}
describe("Issue 238 exact snapshot send gate",()=>{
 it("accepts only the exact staged NEW_ID set",()=>{const f=fixture();expect(()=>verifyIsolatedSendSnapshot(f.preview,f.staged)).not.toThrow()});
 it("blocks changed live candidate",()=>{const f=fixture();f.preview.provinces[0].keys[0]="hiroshima-person:999";expect(()=>verifyIsolatedSendSnapshot(f.preview,f.staged)).toThrow()});
 it("blocks UPDATED classification",()=>{const f=fixture();f.preview.provinces[1].details[0].classification="UPDATED";expect(()=>verifyIsolatedSendSnapshot(f.preview,f.staged)).toThrow("ISOLATED_CLASSIFICATION_CHANGED")});
 it("blocks altered recipient",()=>{const f=fixture();f.staged[0].recipient="getter01@jaspic-nes.net";expect(()=>verifyIsolatedSendSnapshot(f.preview,f.staged)).toThrow("ISOLATED_STAGED_MISMATCH")});
 it("blocks already claimed records",()=>{const f=fixture();f.staged[0].state="SENDING";expect(()=>verifyIsolatedSendSnapshot(f.preview,f.staged)).toThrow("ISOLATED_STAGED_MISMATCH")});
});
