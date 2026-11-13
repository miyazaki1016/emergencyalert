/** Issue #238: explicit pre-send validation boundary.
 * The caller supplies a fresh authenticated READ_ONLY preview and a privileged
 * read-only snapshot of the private test table. No network or DB permissions here. */
import {verifyIsolatedSendSnapshot,type StagedIsolatedRow} from "./isolated-send-gate-238";
import {extractIsolatedCandidates} from "./isolated-preview-238";
import {runIsolatedBatch,type IsolatedPort} from "./isolated-batch-238";

export type IsolatedVerifiedPort = IsolatedPort & {
  freshPreview: () => Promise<unknown>;
  stagedRows: () => Promise<StagedIsolatedRow[]>;
};

export async function runVerifiedIsolatedFirstMail(
  port: IsolatedVerifiedPort,
  accessToken: string,
  request: typeof fetch
): Promise<{claimed:number;sent:number;failed:number;unknown:number;stopped:boolean}> {
  // Gate must complete before the first claim, and only one mail is permitted.
  const preview=await port.freshPreview();
  const staged=await port.stagedRows();
  verifyIsolatedSendSnapshot(preview,staged);
  // A race or faulty DB adapter must not substitute a different row after the gate.
  const expected=new Set(extractIsolatedCandidates(preview).map(c=>c.province+"|"+c.source_id));
  return runIsolatedBatch({
    ...port,
    claim:async limit=>{
      const rows=await port.claim(limit);
      if (!Array.isArray(rows) || rows.length>1 || rows.some(row=>
        !expected.has(row.claimed_prefecture+"|"+row.claimed_source_id)))
        throw new Error("ISOLATED_CLAIM_NOT_IN_SNAPSHOT");
      return rows;
    },
  },accessToken,request,1);
}
