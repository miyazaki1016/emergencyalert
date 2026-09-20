import type { RainFrameStatus, RainIntensityClass, Rgba } from "../../types";
import { findVerifiedIntensity } from "./pngPalette";

export interface PixelClassification {
  status: RainFrameStatus;
  intensityClass: RainIntensityClass | null;
}

export function classifyRainPixel(rgba: Rgba): PixelClassification {
  if (rgba.a === 0) return { status: "NO_DATA", intensityClass: null };
  const intensityClass = findVerifiedIntensity(rgba);
  if (intensityClass) return { status: "RAIN", intensityClass };
  return { status: "UNKNOWN_PIXEL", intensityClass: null };
}
