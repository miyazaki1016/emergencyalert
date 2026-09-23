import type { RainFrameStatus, RainIntensityClass, Rgba } from "../../types";
import { findVerifiedIntensity } from "./pngPalette";

export interface PixelClassification {
  status: RainFrameStatus;
  intensityClass: RainIntensityClass | null;
}

export function classifyRainPixel(rgba: Rgba): PixelClassification {
  // Transparency alone does not prove valid meteorological coverage.
  // Until JMA's public PNG alpha/coverage semantics are independently verified,
  // fail closed instead of turning an unpainted pixel into a no-rain claim.
  if (rgba.a === 0) return { status: "UNKNOWN_PIXEL", intensityClass: null };
  const intensityClass = findVerifiedIntensity(rgba);
  if (intensityClass) return { status: "RAIN", intensityClass };
  return { status: "UNKNOWN_PIXEL", intensityClass: null };
}
