import type { RainFrameStatus, RainIntensityClass, Rgba } from "../../types";
import { findVerifiedIntensity } from "./pngPalette";

export interface PixelClassification {
  status: RainFrameStatus;
  intensityClass: RainIntensityClass | null;
}

export function classifyRainPixel(rgba: Rgba): PixelClassification {
  // JMA precipitation tiles are overlays. A fully transparent pixel means
  // no precipitation is painted at this point; coverage/fetch failures are
  // represented separately by the provider and must never become NO_RAIN.
  if (rgba.a === 0) return { status: "NO_RAIN", intensityClass: null };
  const intensityClass = findVerifiedIntensity(rgba);
  if (intensityClass) return { status: "RAIN", intensityClass };
  return { status: "UNKNOWN_PIXEL", intensityClass: null };
}
