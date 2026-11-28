/** Issue #238: validate the existing read-only preview response before staging.
 * No network, credentials, database writes, or mail. */
export type IsolatedCandidate = { province: "hiroshima" | "shiga"; source_id: string };

export function extractIsolatedCandidates(preview: unknown): IsolatedCandidate[] {
  if (!preview || typeof preview !== "object") throw new Error("PREVIEW_MISSING");
  const p = preview as Record<string, unknown>;
  if (p.mode !== "READ_ONLY" || p.countsComplete !== true ||
      !Array.isArray(p.provinces) || p.provinces.length !== 2 ||
      !Array.isArray(p.provinceErrors) || p.provinceErrors.length !== 0) {
    throw new Error("PREVIEW_INCOMPLETE");
  }
  const counts: Record<string, number> = { hiroshima: 31, shiga: 3 };
  const seen = new Set<string>();
  const result: IsolatedCandidate[] = [];
  for (const province of p.provinces) {
    if (!province || typeof province !== "object") throw new Error("PROVINCE_INVALID");
    const v = province as Record<string, unknown>;
    if (typeof v.province !== "string" || !(v.province in counts) ||
        !Array.isArray(v.keys) || v.keys.length !== counts[v.province] ||
        v.count !== v.keys.length || seen.has("province:" + v.province)) {
      throw new Error("PROVINCE_COUNT_MISMATCH");
    }
    seen.add("province:" + v.province);
    for (const key of v.keys) {
      if (typeof key !== "string" || !/^(hiroshima-person|hiroshima-crime|shiga-person):[^\s]{1,120}$/.test(key) ||
          (v.province === "shiga" ? !key.startsWith("shiga-person:") : !key.startsWith("hiroshima-")) ||
          seen.has(key)) throw new Error("CANDIDATE_KEY_INVALID");
      seen.add(key);
      result.push({ province: v.province as IsolatedCandidate["province"], source_id: key });
    }
  }
  if (result.length !== 34 || seen.size !== 36 || p.total !== 34) throw new Error("SNAPSHOT_TOTAL_MISMATCH");
  return result;
}
