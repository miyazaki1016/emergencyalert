/** Read-only retrospective comparison of ending forecasts against later radar observations.
 * Radar is an independent measurement proxy, NOT a user's actual-weather report.
 * Unmatched or stale readings are UNKNOWN, never counted as dry or success.
 */
export type RadarAuditRow = {
  target_id: string;
  checked_at: string;
  current_status: string | null;
  diagnostic?: {
    endingNoticeCandidate?: { candidate?: string; ending?: { endingTime?: string | null } };
  } | null;
};
export type RadarAuditResult = {
  evaluated: number;
  verifiedDryAtEnding: number;
  stillRainingAtEnding: number;
  reRainWithinTenMinutes: number;
  verifiedNoReRainWithinTenMinutes: number;
  unknownAtEnding: number;
  unknownRecurrence: number;
};
function timeFromJma(value: string | null | undefined): number | null {
  if (!value || !/^\d{14}$/.test(value)) return null;
  const ms = Date.parse(value.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3T$4:$5:$6Z"));
  return Number.isFinite(ms) ? ms : null;
}
const MATCH_TOLERANCE_MS = 2.5 * 60_000;
function matchObservedStatus(rows: RadarAuditRow[], targetTime: number): "RAIN" | "NO_RAIN" | null {
  const matches = rows
    .map(row => ({ status: row.current_status, delta: Math.abs(Date.parse(row.checked_at) - targetTime) }))
    .filter(row => Number.isFinite(row.delta) && row.delta <= MATCH_TOLERANCE_MS)
    .sort((a, b) => a.delta - b.delta);
  // Tied observations that disagree are ambiguous, rather than arbitrarily picking one.
  if (!matches.length || !["RAIN", "NO_RAIN"].includes(matches[0].status ?? "")) return null;
  if (matches.length > 1 && matches[0].delta === matches[1].delta && matches[0].status !== matches[1].status) return null;
  return matches[0].status as "RAIN" | "NO_RAIN";
}
export function auditEndingRadarProxy(rows: RadarAuditRow[]): RadarAuditResult {
  const totals: RadarAuditResult = {
    evaluated: 0, verifiedDryAtEnding: 0, stillRainingAtEnding: 0,
    reRainWithinTenMinutes: 0, verifiedNoReRainWithinTenMinutes: 0,
    unknownAtEnding: 0, unknownRecurrence: 0,
  };
  const byTarget = new Map<string, RadarAuditRow[]>();
  for (const row of rows) {
    const prior = byTarget.get(row.target_id) ?? [];
    prior.push(row);
    byTarget.set(row.target_id, prior);
  }
  for (const row of rows) {
    const candidate = row.diagnostic?.endingNoticeCandidate;
    if (!candidate || !["ENDING_FORECAST", "TEMPORARY_ENDING_FORECAST", "ENDING_WITH_LIMITED_HORIZON", "SHORT_LULL_FORECAST"].includes(candidate.candidate ?? "")) continue;
    const targetMs = timeFromJma(candidate.ending?.endingTime);
    if (targetMs === null) continue;
    totals.evaluated++;
    const later = (byTarget.get(row.target_id) ?? []).filter(observation => Date.parse(observation.checked_at) > Date.parse(row.checked_at));
    const atEnding = matchObservedStatus(later, targetMs);
    if (atEnding === "NO_RAIN") totals.verifiedDryAtEnding++;
    else if (atEnding === "RAIN") totals.stillRainingAtEnding++;
    else totals.unknownAtEnding++;
    // Only evaluate recurrence after radar independently confirms dryness at target time.
    if (atEnding !== "NO_RAIN") {
      totals.unknownRecurrence++;
      continue;
    }
    const after5 = matchObservedStatus(later, targetMs + 5 * 60_000);
    const after10 = matchObservedStatus(later, targetMs + 10 * 60_000);
    if (after5 === "RAIN" || after10 === "RAIN") totals.reRainWithinTenMinutes++;
    else if (after5 === "NO_RAIN" && after10 === "NO_RAIN") totals.verifiedNoReRainWithinTenMinutes++;
    else totals.unknownRecurrence++;
  }
  return totals;
}
