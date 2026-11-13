import {createClient} from "@supabase/supabase-js";
import {timingSafeEqual,randomUUID} from "node:crypto";
import {readEncryptedGmailRefreshToken} from "../../../lib/jaspic/oauth-gmail-token-store-server";
import {collect, type Province} from "../../../supabase/functions/_shared/jaspic/collect";
import {productionPlan} from "../../../lib/jaspic/production-plan";
import {sendProductionMail} from "../../../lib/jaspic/production-gmail";
import {hasBulkSendTimeBudget} from "../../../lib/jaspic/bulk-send-budget";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store, private"}});

export async function POST(request:Request) {
  const secret=process.env.JASPIC_DISPATCH_TOKEN;
  const supplied=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
  if (!secret||supplied.length!==secret.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(secret))) return response({error:"UNAUTHORIZED"},401);
  if (process.env.JASPIC_PRODUCTION_SEND_ENABLED!=="true") return response({error:"DISABLED"},503);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/,"");
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerId=process.env.JASPIC_ADMIN_USER_ID;
  const encryptionKey=process.env.JASPIC_GMAIL_TOKEN_VAULT_KEY;
  const clientId=process.env.JASPIC_GOOGLE_WEB_CLIENT_ID;
  const clientSecret=process.env.JASPIC_GOOGLE_WEB_CLIENT_SECRET;
  if (!url||!key||!ownerId||!encryptionKey||!clientId||!clientSecret) return response({error:"NOT_CONFIGURED"},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  async function rpc(name:string,args:Record<string,unknown>={}) {const r=await db.rpc(name,args);if(r.error)throw new Error("DATABASE_GUARD");return r.data;}
  const dispatchStartedAt=Date.now();
  const id=randomUUID(); let started=false;
  const sent={hiroshima:0,shiga:0};
  let stage="begin-run";
  let province:Province|null=null;
  const sourceErrors:{province:Province;code:string}[]=[];
  try {
    if (!await rpc("jaspic_begin_run",{p_id:id})) return response({error:"RUN_LOCKED"},409);
    started=true;
    // Preflight both complete sources before persisting or sending either province.
    const provinces:Province[]=["hiroshima","shiga"];
    const legacy=await rpc("jaspic_legacy_hiroshima_person_ids");
    if(!Array.isArray(legacy)||legacy.some(x=>typeof x!=="string"))throw new Error("LEGACY_HISTORY_INVALID");
    stage="source-preflight";
    const settled=await Promise.allSettled(provinces.map(async province=>{
      const snapshot=await rpc("jaspic_snapshot",{p_province:province});
      let items;
      try { items=await collect(province); } catch {
        sourceErrors.push({province,code:"SOURCE_FETCH_FAILED"});
        throw new Error("SOURCE_FETCH_FAILED");
      }
      return {province,result:await productionPlan(province,snapshot,items,new Set(province==="hiroshima"?legacy:[]))};
    }));
    const failure=settled.find(r=>r.status==="rejected");
    if(failure?.status==="rejected")throw failure.reason;
    const plans=settled.flatMap(r=>r.status==="fulfilled"?[r.value]:[]);
    stage="plan-guard";
    const unresolved=await db.from("jaspic_deliveries").select("status").in("status",["PREPARED","SENDING","UNKNOWN","FAILED"]).limit(1);
    if(unresolved.error||unresolved.data.length)throw new Error("UNRESOLVED_DELIVERY");
    // Refresh validates the existing encrypted OAuth credential even for a zero-item run.
    stage="gmail-auth";
    const refresh=await readEncryptedGmailRefreshToken({db,ownerId,expectedAdminId:ownerId,encryptionKey});
    if(!refresh)throw new Error("GMAIL_NOT_CONNECTED");
    const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refresh,grant_type:"refresh_token"}),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10_000)});
    if(!tokenResponse.ok)throw new Error("GMAIL_REFRESH_FAILED");
    const token=await tokenResponse.json();
    if(typeof token.access_token!=="string"||token.access_token.length<8)throw new Error("GMAIL_TOKEN_INVALID");
    stage="time-budget-guard";
    const candidateCount=plans.reduce((sum,p)=>sum+p.result.candidates.length,0);
    // Reject before persisting any PREPARED deliveries when the remaining time
    // cannot cover the Gmail request timeout per message plus a DB safety reserve.
    if(!hasBulkSendTimeBudget(candidateCount,Date.now()-dispatchStartedAt))throw new Error("BULK_SEND_TIME_BUDGET");
    stage="prepare-delivery";
    for(const {province,result} of plans){
      const candidates=result.candidates.map(c=>({...c,mail:{...c.mail,from:"miyazaki1016@gmail.com",to:"getter01@jaspic-nes.net",cc:null}}));
      await rpc("jaspic_prepare_production",{p_id:id,p_province:province,p_revision:result.expectedRevision,p_records:result.records,p_candidates:candidates});
    }
    // Read immutable queued payloads, never regenerate mail after observation was committed.
    const queue=await db.from("jaspic_deliveries").select("province,record_key,version,mail").eq("run_id",id).eq("status","PREPARED");
    if(queue.error)throw new Error("QUEUE_READ_FAILED");
    stage="gmail-send";
    for(const delivery of queue.data){
      province=delivery.province as Province;
      const lease=randomUUID();
      if(!await rpc("jaspic_claim",{p_province:delivery.province,p_key:delivery.record_key,p_version:delivery.version,p_token:lease}))throw new Error("CLAIM_REJECTED");
      const outcome=await sendProductionMail(token.access_token,delivery.mail);
      if(!await rpc("jaspic_finish_production",{p_id:id,p_province:delivery.province,p_key:delivery.record_key,p_version:delivery.version,p_token:lease,p_status:outcome.status,p_message:outcome.message,p_error:outcome.error}))throw new Error("OUTCOME_NOT_SAVED");
      if(outcome.status!=="SENT")throw new Error(outcome.error??"SEND_FAILED");
      sent[delivery.province as Province]++;
    }
    stage="save-result";
    province=null;
    const result={runId:id,status:"SUCCEEDED",sent,candidates:plans.map(p=>({province:p.province,count:p.result.candidates.length})),quarantined:plans.map(p=>({province:p.province,count:p.result.quarantined.length}))};
    const saved=await db.from("jaspic_runs").update({status:"SUCCEEDED",finished_at:new Date().toISOString(),result}).eq("id",id).eq("status","RUNNING").select("id");
    if(saved.error||saved.data.length!==1)throw new Error("RUN_RESULT_NOT_SAVED");
    return response(result);
  } catch(error) {
    const code=error instanceof Error&&/^[A-Z][A-Z0-9_]{0,79}$/.test(error.message)?error.message:"JASPIC_RUN_FAILED";
    if(started){
      // A process crash remains RUNNING. Network uncertainty remains non-retryable SENDING/UNKNOWN.
      await db.from("jaspic_deliveries").update({status:"UNKNOWN",error_code:"RUN_INTERRUPTED",finished_at:new Date().toISOString()}).eq("run_id",id).eq("status","SENDING");
      await db.from("jaspic_runs").update({status:"FAILED",finished_at:new Date().toISOString(),error_code:code,result:{sent,stage,province,sourceErrors}}).eq("id",id).eq("status","RUNNING");
    }
    return response({runId:id,status:"FAILED",error:code,sent},503);
  }
}
