/** Issue #238: explicit pre-send validation boundary.
 * The caller supplies a fresh authenticated READ_ONLY preview and a privileged
 * read-only snapshot of the private test table. No network or DB permissions here. */
import {verifyIsolatedSendSnapshot,type StagedIsolatedRow} from "./isolated-send-gate-238";
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
  return runIsolatedBatch(port,accessToken,request,1);
}
