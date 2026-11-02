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
