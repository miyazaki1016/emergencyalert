/** Research-only adapter: compare successive JMA issuances recorded by the compact watch history.
 * Always isolate by target; do not infer ground truth or influence notifications.
 */
import { unpackForecastEvidence } from "../../supabase/functions/_shared/forecastEvidenceCompact.ts";
import { analyzeSevereConsistency, type SevereConsistency, type SevereIssuance } from "./severeRainConsistency.ts";

export type StoredForecastHistory = {
  targetId: string;
  checkedAt: string;
  diagnostic: unknown;
};
export type ForecastHistoryComparison = {
  result: SevereConsistency;
  usableSnapshots: number;
  skippedSnapshots: number;
  completeSnapshots: number;
};

/** Includes PARTIAL snapshots with usable frames, but does not impute missing frames. */
export function compareStoredForecasts(
  history: StoredForecastHistory[],
  targetId: string,
  targetTime: string,
  asOf: string,
): ForecastHistoryComparison {
  const cutoff = Date.parse(asOf);
  if (!Number.isFinite(cutoff)) throw new Error("INVALID_AS_OF");
  const issuances: SevereIssuance[] = [];
  let usableSnapshots = 0;
  let skippedSnapshots = 0;
  let completeSnapshots = 0;
  for (const row of history) {
    if (row.targetId !== targetId) continue;
    const collected = Date.parse(row.checkedAt);
    if (!Number.isFinite(collected) || collected > cutoff) continue;
    const diagnostic = row.diagnostic;
    const packed = diagnostic && typeof diagnostic === "object" && !Array.isArray(diagnostic)
      ? (diagnostic as Record<string, unknown>).forecastEvidenceCompact
      : null;
    const evidence = unpackForecastEvidence(packed);
    if (!evidence || !evidence.frames.length) { skippedSnapshots++; continue; }
    usableSnapshots++;
    if (evidence.state === "COMPLETE") completeSnapshots++;
    issuances.push({
      frames: evidence.frames
        .filter(f => typeof f.baseTime === "string" && typeof f.validTime === "string" && typeof f.status === "string")
        .map(f => ({
          baseTime: f.baseTime!,
          validTime: f.validTime!,
          status: f.status!,
          intensityClass: f.intensityClass ?? null,
        })),
    });
  }
  // asOf is UTC YYYYMMDDHHmmss for consistency analyzer, while checkedAt is ISO.
  const asOfJma = new Date(cutoff).toISOString().replace(/\D/g, "").slice(0,14);
  return {
    result: analyzeSevereConsistency(issuances, targetTime, asOfJma),
    usableSnapshots, skippedSnapshots, completeSnapshots,
  };
}
