/** Research-only monitoring policy for consecutive evidence persistence results.
 * No DB writes, alerts, notifications, or production wiring.
 */
export type EvidenceWriteOutcome = "SUCCESS" | "FAILED" | "UNKNOWN";
export type EvidenceWriteHealth = {
  status: "HEALTHY" | "WARNING" | "CRITICAL" | "UNKNOWN";
  consecutiveFailures: number;
};
export function assessEvidenceWriteHealth(
  outcomesNewestFirst: EvidenceWriteOutcome[],
  warningFailures: number,
  criticalFailures: number,
): EvidenceWriteHealth {
  if (!Number.isSafeInteger(warningFailures) || warningFailures < 1 ||
      !Number.isSafeInteger(criticalFailures) || criticalFailures <= warningFailures)
    throw Error("INVALID_FAILURE_THRESHOLDS");
  if (!outcomesNewestFirst.length || outcomesNewestFirst[0] === "UNKNOWN")
    return {status:"UNKNOWN",consecutiveFailures:0};
  let failures=0;
  for (const outcome of outcomesNewestFirst) {
    if (outcome === "UNKNOWN") break;
    if (outcome === "SUCCESS") break;
    if (outcome !== "FAILED") throw Error("INVALID_WRITE_OUTCOME");
    failures++;
  }
  return {status:failures>=criticalFailures?"CRITICAL":
    failures>=warningFailures?"WARNING":"HEALTHY",consecutiveFailures:failures};
}
