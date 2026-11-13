import {describe,it,expect} from "vitest";
import {sendProductionMail,productionRaw} from "../../lib/jaspic/production-gmail";
import {productionPlan} from "../../lib/jaspic/production-plan";
import {fields} from "../../supabase/functions/_shared/jaspic/mail";
import {plan} from "../../supabase/functions/_shared/jaspic/state";
import type {Item} from "../../supabase/functions/_shared/jaspic/collect";
const mail={subject:" [JASPIC-NES] 滋賀県警専用ツール",body:"本文\r\n"};
const item=(id:string,date="2026-11-08 12:00:00"):Item=>({kind:"shiga-person",data:{...Object.fromEntries(fields["shiga-person"].map(f=>[f,""])),id,occurrence_dt:date,case_type:"1"},context:{cityName:"大津市",stationName:""}});
describe("production safety",()=>{
 it("uses a fixed recipient and no Cc while preserving body bytes",()=>{const raw=Buffer.from(productionRaw(mail),"base64url").toString();expect(raw).toContain("To: getter01@jaspic-nes.net\r\n");expect(raw).not.toContain("Cc:");expect(Buffer.from(raw.split("\r\n\r\n")[1],"base64").toString()).toBe(mail.body)});
 it("requires Gmail acceptance ID",async()=>{expect((await sendProductionMail("secret",mail,async()=>Response.json({}))).status).toBe("UNKNOWN")});
 it("records network uncertainty without retry",async()=>{let calls=0;expect((await sendProductionMail("secret",mail,async()=>{calls++;throw new Error("timeout")})).status).toBe("UNKNOWN");expect(calls).toBe(1)});
 it("distinguishes rejection from ambiguous server failure",async()=>{expect((await sendProductionMail("s",mail,async()=>new Response(null,{status:403}))).status).toBe("FAILED");expect((await sendProductionMail("s",mail,async()=>new Response(null,{status:500}))).status).toBe("UNKNOWN")});
 it("records confirmed acceptance",async()=>{expect(await sendProductionMail("s",mail,async()=>Response.json({id:"abc123"}))).toEqual({status:"SENT",message:"abc123",error:null})});
 it("never backfills an established baseline",async()=>{const i=item("1");expect((await productionPlan("shiga",{revision:4,baseline:true,records:{"shiga-person:1":i.data}},[i],new Set())).candidates).toHaveLength(0)});
 it("plans a historical unknown ID once without marking it sent prematurely",async()=>{const base=Array.from({length:10},(_,i)=>item(String(i)));const records=Object.fromEntries(base.map(i=>["shiga-person:"+i.data.id,i.data]));const result=await productionPlan("shiga",{revision:4,baseline:true,records},[...base,item("unknown","2026-10-01 12:00:00")],new Set());expect(result.quarantined).toEqual([]);expect(result.candidates.map(c=>c.key)).toEqual(["shiga-person:unknown"]);expect(result.records).toHaveProperty("shiga-person:unknown")});
 it("detects a missing source kind",async()=>{await expect(productionPlan("hiroshima",{revision:4,baseline:true,records:{"hiroshima-person:1":{},"hiroshima-crime:1":{}}},[],new Set())).rejects.toThrow("SOURCE_COUNT")});
 it("does not apply legacy initial-only exclusion to updates",async()=>{const i=item("1");i.kind="hiroshima-person";i.data={...Object.fromEntries(fields[i.kind].map(f=>[f,""])),id:"1",occurrence_dt:"2026-11-08 12:00:00",case_type:"声かけ"};const old={...i.data,address:"old"};const r=await plan("hiroshima",{revision:4,baseline:true,records:{"hiroshima-person:1":old}},[i],{legacyHiroshimaPersonIds:new Set(["1"])});expect(r.candidates).toHaveLength(1)});
});
