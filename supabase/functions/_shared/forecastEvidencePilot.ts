/**
 * Fail-closed, explicitly time-boxed research capture.
 * Missing/malformed configuration never enables full forecast evidence writes.
 * This is NOT a retention policy: existing records are never deleted.
 */
export function shouldCaptureForecastEvidence(
  nowIso: string,
  startIso: string | undefined,
  endIso: string | undefined,
): boolean {
  if (!startIso || !endIso) return false;
  const parse = (value: string): number | null => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) && new Date(ms).toISOString() === value ? ms : null;
  };
  const now = parse(nowIso), start = parse(startIso), end = parse(endIso);
  if (now === null || start === null || end === null) return false;
  const maxDurationMs = 24 * 60 * 60 * 1000;
  if (end <= start || end - start > maxDurationMs) return false;
  return now >= start && now < end;
}
