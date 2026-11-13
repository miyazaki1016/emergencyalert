/** Issue #238: offline orchestration contract for private-schema Gmail tests.
 * No production imports, no credentials, no direct DB or network access. */
import { sendIsolatedTestMail } from "./isolated-gmail-238";

export type IsolatedClaim = {
  claimed_id: number;
  claimed_prefecture: "hiroshima" | "shiga";
  claimed_source_id: string;
  claimed_recipient: string;
};
type Outcome = "SENT" | "FAILED" | "UNKNOWN";
export type IsolatedPort = {
  claim: (limit: number) => Promise<IsolatedClaim[]>;
  finish: (id: number, outcome: Outcome, gmailId: string | null) => Promise<boolean>;
  mailFor: (claim: IsolatedClaim) => Promise<{ subject: string; body: string }>;
};
export async function runIsolatedBatch(
  port: IsolatedPort,
  token: string,
  request: typeof fetch,
  maxItems = 10
): Promise<{claimed:number;sent:number;failed:number;unknown:number;stopped:boolean}> {
  if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 10 || !token || !request)
    throw new Error("ISOLATED_BATCH_NOT_CONFIGURED");
  // Claim only one at a time: an early stop must not strand the other nine in SENDING.
  const seen = new Set<number>();
  let claimedCount=0;
  let sent=0, failed=0, unknown=0;
  for (let n=0; n<maxItems; n++) {
    const claimed = await port.claim(1);
    if (!Array.isArray(claimed) || claimed.length > 1) throw new Error("ISOLATED_CLAIM_INVALID");
    if (claimed.length===0) break;
    const item=claimed[0];
    claimedCount++;
    if (!Number.isSafeInteger(item.claimed_id) || item.claimed_id < 1 ||
        !/^(hiroshima-person|hiroshima-crime|shiga-person):[^\s]{1,120}$/.test(item.claimed_source_id) ||
        (item.claimed_prefecture === "shiga" ? !item.claimed_source_id.startsWith("shiga-") :
          !item.claimed_source_id.startsWith("hiroshima-")) ||
        item.claimed_recipient !== "kishibojim@gmail.com" || seen.has(item.claimed_id))
      throw new Error("ISOLATED_CLAIM_INVALID");
    seen.add(item.claimed_id);
    let result: {status:Outcome;message:string|null} = {status:"UNKNOWN",message:null};
    try {
      const mail = await port.mailFor(item);
      result = await sendIsolatedTestMail(token,mail,request);
    } catch {
      // Claim already persisted. Do not retry a potentially attempted send.
      result = {status:"UNKNOWN",message:null};
    }
    let saved=false;
    try { saved = await port.finish(item.claimed_id,result.status,result.message); }
    catch { saved=false; }
    if (!saved) throw new Error("ISOLATED_OUTCOME_NOT_PERSISTED");
    if (result.status==="SENT") sent++;
    else if (result.status==="FAILED") failed++;
    else unknown++;
    // Fail closed: no further Gmail calls after any non-success.
    if (result.status!=="SENT") return {claimed:claimedCount,sent,failed,unknown,stopped:true};
  }
  return {claimed:claimed.length,sent,failed,unknown,stopped:false};
}
