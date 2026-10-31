/**
 * Research-only severe-rain forecast consistency analysis.
 * This module does not decide whether to send or suppress notifications.
 * Times are JMA UTC YYYYMMDDHHmmss strings.
 */
export type SevereFrame = {
  baseTime: string;
  validTime: string;
  status: string;
  intensityClass?: string | null;
};
export type SevereIssuance = { frames: SevereFrame[] };
export type SevereConsistency = {
  targetTime: string;
  latestBaseTime: string | null;
  latestSevere: boolean;
  priorBaseTime: string | null;
  priorSevere: boolean | null;
  continuity: "PERSISTENT" | "NEW" | "ABSENT" | "UNKNOWN";
};
const severe = new Set(["30_TO_50", "50_TO_80", "GTE_80"]);
const validTime = (s: string): number | null => {
  if (!/^\d{14}$/.test(s)) return null;
  const n = Date.UTC(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8), +s.slice(8,10), +s.slice(10,12), +s.slice(12,14));
  return Number.isFinite(n) && new Date(n).toISOString().replace(/[-:T.Z]/g, "").slice(0,14) === s ? n : null;
};
export function analyzeSevereConsistency(
  issuances: SevereIssuance[],
  targetTime: string,
  asOf: string,
): SevereConsistency {
  const cutoff = validTime(asOf), target = validTime(targetTime);
  if (cutoff === null || target === null) throw new Error("INVALID_TIME");
  const groups = new Map<string, SevereFrame[]>();
  for (const issuance of issuances) for (const frame of issuance.frames) {
    const base = validTime(frame.baseTime);
    if (base === null || base > cutoff || validTime(frame.validTime) === null) continue;
    const list = groups.get(frame.baseTime) ?? [];
    list.push(frame);
    groups.set(frame.baseTime, list);
  }
  const bases = [...groups.keys()].sort().reverse();
  const [latestBaseTime, priorBaseTime] = bases;
  const at = (base: string): boolean | null => {
    const matches = groups.get(base)!.filter(f => f.validTime === targetTime);
    if (!matches.length || matches.some(f => f.status !== "RAIN" && f.status !== "NO_RAIN")) return null;
    return matches.some(f => f.status === "RAIN" && severe.has(f.intensityClass ?? ""));
  };
  const latest = latestBaseTime ? at(latestBaseTime) : null;
  const prior = priorBaseTime ? at(priorBaseTime) : null;
  return {
    targetTime,
    latestBaseTime: latestBaseTime ?? null,
    latestSevere: latest === true,
    priorBaseTime: priorBaseTime ?? null,
    priorSevere: prior,
    continuity: latest === null || (latest && prior === null) ? "UNKNOWN"
      : !latest ? "ABSENT" : prior ? "PERSISTENT" : "NEW",
  };
}
