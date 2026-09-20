import type { OfficialRainFrame } from "../types";
import type { RainInterpretation } from "./RainInterpretationEngine";

const UNSAFE = new Set(["UNKNOWN_PIXEL", "NO_DATA", "OUT_OF_COVERAGE", "FETCH_ERROR"]);

/**
 * Decides whether an already-derived interpretation has enough evidence to be
 * published. This is claim-specific: an unrelated later gap must not erase a
 * valid near-term rain claim, while DRY still requires complete usable
 * coverage (enforced by the interpretation engine).
 */
export function canPublishRainInterpretation(
  interpretation: RainInterpretation,
  observation: readonly OfficialRainFrame[],
  forecast: readonly OfficialRainFrame[],
): boolean {
  if (interpretation.state === "INSUFFICIENT_DATA") return false;
  const current = observation[0];
  if (!current || UNSAFE.has(current.status)) return false;

  switch (interpretation.state) {
    case "DRY":
      return forecast.every((frame) => !UNSAFE.has(frame.status));

    case "ACTIONABLE_RAIN":
    case "RAIN_AHEAD": {
      const claimTime =
        interpretation.firstActionableRainTime ?? interpretation.firstRainTime;
      if (!claimTime) return false;
      return framesThrough(claimTime, forecast).every((frame) => !UNSAFE.has(frame.status));
    }

    case "ENDING":
      if (!interpretation.endingTime) return false;
      return endingEvidenceIsUsable(interpretation.endingTime, forecast);

    case "EASING":
      return forecast.slice(0, 3).every((frame) => !UNSAFE.has(frame.status));

    case "RAINING":
      return true;
  }
}

function framesThrough(
  validTime: string,
  frames: readonly OfficialRainFrame[],
): OfficialRainFrame[] {
  return frames.filter((frame) => frame.validTime <= validTime);
}

function endingEvidenceIsUsable(
  endingTime: string,
  frames: readonly OfficialRainFrame[],
): boolean {
  const start = frames.findIndex((frame) => frame.validTime === endingTime);
  if (start < 0) return false;
  return frames.slice(start, start + 3).length === 3 &&
    frames.slice(start, start + 3).every(
      (frame) => !UNSAFE.has(frame.status) && frame.status === "NO_RAIN",
    );
}
