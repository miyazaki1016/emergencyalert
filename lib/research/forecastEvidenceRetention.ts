/**
 * Research-only retention gate for compact forecast evidence.
 * Never deletes DB rows and never applies to legacy diagnostics or
 * immutable notification evaluation snapshots.
 */
export type RetentionRecord = {
  schemaVersion: number | null;
  recordedAt: string;
  expiresAt: string | null;
  notificationEvidenceLinked: boolean;
  preservationHold: boolean;
};
export type RetentionDecision = "KEEP" | "ELIGIBLE" | "REVIEW";
export function classifyEvidenceRetention(record: RetentionRecord, now: string): RetentionDecision {
  const clock=Date.parse(now), created=Date.parse(record.recordedAt);
  if (!Number.isFinite(clock) || !Number.isFinite(created) || created > clock) return "REVIEW";
  if (record.schemaVersion !== 1 || record.notificationEvidenceLinked || record.preservationHold) return "KEEP";
  if (record.expiresAt===null) return "REVIEW";
  const expiry=Date.parse(record.expiresAt);
  if (!Number.isFinite(expiry) || expiry<created) return "REVIEW";
  return clock>=expiry ? "ELIGIBLE" : "KEEP";
}

/**
 * Read-only adapter for the ACTUAL rain_diagnostic_history schema.
 * Currently there is no evidence-specific expiry or preservation flag in that
 * table. Never infer expiry from checked_at: conservatively request review.
 */
export function inspectStoredEvidenceRetention(row: {
  checked_at: string;
  diagnostic: unknown;
}, now: string): RetentionDecision {
  if (!row.diagnostic || typeof row.diagnostic !== "object" || Array.isArray(row.diagnostic)) return "KEEP";
  const object = row.diagnostic as Record<string, unknown>;
  const evidence = object.forecastEvidenceCompact;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return "KEEP";
  const version = (evidence as Record<string, unknown>).schemaVersion;
  if (version !== 1) return "KEEP";
  // No expires_at, hold or verified notification linkage exists in this row.
  // A real cleanup operation MUST use explicit, separately audited metadata.
  return classifyEvidenceRetention({
    schemaVersion: 1,
    recordedAt: row.checked_at,
    expiresAt: null,
    notificationEvidenceLinked: false,
    preservationHold: false,
  }, now);
}
