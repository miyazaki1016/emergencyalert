/** Issue #238: fail-closed cross-check of fresh read-only preview and staged rows.
 * This function does not read or write any production database. */
import {extractIsolatedCandidates} from "./isolated-preview-238";

export type StagedIsolatedRow = {
  prefecture: "hiroshima" | "shiga";
  source_id: string;
  recipient: string;
  state: string;
};
export function verifyIsolatedSendSnapshot(preview: unknown, staged: readonly StagedIsolatedRow[]): void {
  const candidates=extractIsolatedCandidates(preview);
  if (!preview || typeof preview!=="object") throw new Error("ISOLATED_PREVIEW_INVALID");
  const p=preview as Record<string,unknown>;
  if (!Array.isArray(p.provinces)) throw new Error("ISOLATED_PREVIEW_INVALID");
  const classified=new Set<string>();
  for(const province of p.provinces){
    if (!province || typeof province!=="object") throw new Error("ISOLATED_PREVIEW_INVALID");
    const v=province as Record<string,unknown>;
    if (!Array.isArray(v.details) || v.details.length!==v.count) throw new Error("ISOLATED_DETAILS_INVALID");
    for(const detail of v.details){
      if(!detail || typeof detail!=="object") throw new Error("ISOLATED_DETAILS_INVALID");
      const d=detail as Record<string,unknown>;
      if(typeof d.key!=="string" || d.classification!=="NEW_ID" || classified.has(d.key))
        throw new Error("ISOLATED_CLASSIFICATION_CHANGED");
      classified.add(d.key);
    }
  }
  const expected=new Set(candidates.map(c=>c.province+"|"+c.source_id));
  if (staged.length!==34 || classified.size!==34) throw new Error("ISOLATED_STAGED_COUNT_MISMATCH");
  for(const candidate of candidates) if(!classified.has(candidate.source_id))
    throw new Error("ISOLATED_DETAILS_MISMATCH");
  const seen=new Set<string>();
  for(const row of staged){
    const key=row.prefecture+"|"+row.source_id;
    if(!expected.has(key) || seen.has(key) || row.recipient!=="kishibojim@gmail.com" || row.state!=="PREPARED")
      throw new Error("ISOLATED_STAGED_MISMATCH");
    seen.add(key);
  }
  if(seen.size!==expected.size) throw new Error("ISOLATED_STAGED_MISMATCH");
}
