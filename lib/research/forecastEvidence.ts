/** Research-only extraction of complete forecast evidence from a rain API response.
 * Independent of diagnostic, which is intentionally null on healthy responses.
 * Does not write data or decide notification eligibility.
 */
export type ForecastEvidenceFrame = {
  baseTime: string; validTime: string; status: string;
  intensityClass: string | null;
  rgba: { r: number; g: number; b: number; a: number } | null;
};
export type ForecastEvidenceResult = {
  state: "COMPLETE" | "PARTIAL" | "MISSING";
  expectedFrames: number | null;
  frames: ForecastEvidenceFrame[];
  reason: string | null;
};
export function extractForecastEvidence(response: {
  forecast?: Array<{baseTime?: string; validTime?: string; status?: string; intensityClass?: string | null; rgba?: ForecastEvidenceFrame["rgba"]}>;
  diagnostic?: { expectedForecastFrames?: number } | null;
}, expectedFrames?: number | null): ForecastEvidenceResult {
  const expected = Number.isInteger(expectedFrames) && (expectedFrames ?? 0) > 0
    ? expectedFrames! : Number.isInteger(response.diagnostic?.expectedForecastFrames) && (response.diagnostic?.expectedForecastFrames ?? 0) > 0
    ? response.diagnostic!.expectedForecastFrames! : null;
  const raw = response.forecast ?? [];
  const frames = raw.filter(f => typeof f.baseTime === "string" && typeof f.validTime === "string" && typeof f.status === "string").map(f => ({
    baseTime: f.baseTime!, validTime: f.validTime!, status: f.status!,
    intensityClass: f.intensityClass ?? null, rgba: f.rgba ?? null,
  }));
  if (!raw.length) return { state: "MISSING", expectedFrames: expected, frames: [], reason: "NO_FORECAST_FRAMES" };
  if (frames.length !== raw.length) return { state: "PARTIAL", expectedFrames: expected, frames, reason: "INCOMPLETE_FRAME_FIELDS" };
  if (expected === null) return { state: "PARTIAL", expectedFrames: null, frames, reason: "EXPECTED_COUNT_UNKNOWN" };
  if (frames.length !== expected) return { state: "PARTIAL", expectedFrames: expected, frames, reason: "FRAME_COUNT_MISMATCH" };
  return { state: "COMPLETE", expectedFrames: expected, frames, reason: null };
}
