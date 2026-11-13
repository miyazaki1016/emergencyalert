import {createClient} from "@supabase/supabase-js";
import {timingSafeEqual,randomUUID} from "node:crypto";
import {readEncryptedGmailRefreshToken} from "../../../lib/jaspic/oauth-gmail-token-store-server";
import {collect, type Province} from "../../../supabase/functions/_shared/jaspic/collect";
import {productionPlan} from "../../../lib/jaspic/production-plan";
import {sendProductionMail} from "../../../lib/jaspic/production-gmail";
import {selectDispatchBatch} from "../../../lib/jaspic/dispatch-batch";

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
    // Never observe a new source snapshot while any older delivery is pending.
    // A previous interrupted RUNNING run remains locked for manual review.
    stage="queue-guard";
    const unresolved=await db.from("jaspic_deliveries").select("status").in("status",["SENDING","UNKNOWN","FAILED"]).limit(1);
    if(unresolved.error)throw new Error("QUEUE_READ_FAILED");
    if(unresolved.data.length){
      throw new Error("UNRESOLVED_DELIVERY");
    }
    const pending=await db.from("jaspic_deliveries").select("record_key").eq("status","PREPARED").limit(1);
    if(pending.error)throw new Error("QUEUE_READ_FAILED");
    const resuming=pending.data.length>0;
    const priorRun=request.headers.get("x-jaspic-resume-run");
    if (priorRun !== null) {
      if (!/^[0-9a-f-]{36}$/.test(priorRun)) throw new Error("INVALID_RESUME_RUN");
      const queued=await db.from("jaspic_deliveries").select("run_id")
        .eq("status","PREPARED").eq("run_id",priorRun).limit(1);
      if (queued.error || !queued.data.length) throw new Error("RESUME_QUEUE_CHANGED");
    }
    let plans: {province:Province;result:Awaited<ReturnType<typeof productionPlan>>}[]=[];
    if(!resuming){
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
      plans=settled.flatMap(r=>r.status==="fulfilled"?[r.value]:[]);
      }
    // Refresh validates the existing encrypted OAuth credential even for a zero-item run.
    stage="gmail-auth";
    const refresh=await readEncryptedGmailRefreshToken({db,ownerId,expectedAdminId:ownerId,encryptionKey});
    if(!refresh)throw new Error("GMAIL_NOT_CONNECTED");
    const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refresh,grant_type:"refresh_token"}),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10_000)});
    if(!tokenResponse.ok)throw new Error("GMAIL_REFRESH_FAILED");
    const token=await tokenResponse.json();
    if(typeof token.access_token!=="string"||token.access_token.length<8)throw new Error("GMAIL_TOKEN_INVALID");
    if(resuming){
      stage="resume-delivery";
      await rpc("jaspic_resume_prepared",{p_id:id});
    }else{
      stage="prepare-delivery";
      const preparedPlans=plans.map(({province,result})=>({
        province,revision:result.expectedRevision,records:result.records,
        candidates:result.candidates.map(c=>({...c,mail:{...c.mail,from:"miyazaki1016@gmail.com",to:"getter01@jaspic-nes.net",cc:null}})),
      }));
      // One RPC/transaction: never commit Hiroshima's snapshot without Shiga's.
      await rpc("jaspic_prepare_all_production",{p_id:id,p_plans:preparedPlans});
    }
    // Immutable mail is always read from the ledger. Limit only the sending,
    // never the candidate persistence or source snapshot.
    const queue=await db.from("jaspic_deliveries").select("province,record_key,version,mail")
      .eq("run_id",id).eq("status","PREPARED")
      .order("province",{ascending:true}).order("record_key",{ascending:true})
      .order("version",{ascending:true}).limit(1000);
    if(queue.error)throw new Error("QUEUE_READ_FAILED");
    const {selected}=selectDispatchBatch(queue.data,300_000-(Date.now()-dispatchStartedAt));
    stage="gmail-send";
    for(const delivery of selected){
      province=delivery.province as Province;
      const lease=randomUUID();
      if(!await rpc("jaspic_claim",{p_province:delivery.province,p_key:delivery.record_key,p_version:delivery.version,p_token:lease}))throw new Error("CLAIM_REJECTED");
      const outcome=await sendProductionMail(token.access_token,delivery.mail);
      if(!await rpc("jaspic_finish_production",{p_id:id,p_province:delivery.province,p_key:delivery.record_key,p_version:delivery.version,p_token:lease,p_status:outcome.status,p_message:outcome.message,p_error:outcome.error}))throw new Error("OUTCOME_NOT_SAVED");
      if(outcome.status!=="SENT")throw new Error(outcome.error??"SEND_FAILED");
      sent[delivery.province as Province]++;
    }
    stage="save-result";
    const remaining=await db.from("jaspic_deliveries").select("record_key",{count:"exact",head:true}).eq("status","PREPARED");
    if(remaining.error||remaining.count===null)throw new Error("QUEUE_READ_FAILED");
    province=null;
    const result={runId:id,status:"SUCCEEDED",remainingPrepared:remaining.count,resuming,sent,candidates:plans.map(p=>({province:p.province,count:p.result.candidates.length})),quarantined:plans.map(p=>({province:p.province,count:p.result.quarantined.length}))};
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
