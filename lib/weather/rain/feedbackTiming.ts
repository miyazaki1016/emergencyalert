/** Restrict premature negative feedback, without treating missing times as proof.
 * Notification 'already raining/dry' and 'unknown' can be reported immediately.
 */
export function forecastTargetEpoch(value: string | null | undefined): number | null {
  if (!value || !/^\d{14}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  const second = Number(value.slice(12, 14));
  const time = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(time) || new Date(time).toISOString().replace(/[-:TZ.]/g, "").slice(0, 14) !== value) return null;
  return time;
}

export function feedbackTooEarly(
  value: string,
  forecastTargetTime: string | null | undefined,
  now: number,
): boolean {
  if (value !== "DID_NOT_RAIN" && value !== "DID_NOT_STOP") return false;
  const target = forecastTargetEpoch(forecastTargetTime);
  return target !== null && now < target;
}
