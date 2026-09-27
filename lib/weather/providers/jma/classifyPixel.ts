import type { RainFrameStatus, RainIntensityClass, Rgba } from "../../types";
import { findVerifiedIntensity } from "./pngPalette";

export interface PixelClassification {
  status: RainFrameStatus;
  intensityClass: RainIntensityClass | null;
}

export function classifyRainPixel(rgba: Rgba): PixelClassification {
  // Current JMA hrpns PNG field evidence (2026-09-26/27) shows transparent
  // pixels at dry locations, including a same-location transition
  // transparent -> verified rain color -> transparent as rain passed.
  if (rgba.a === 0) return { status: "NO_RAIN", intensityClass: null };
  const intensityClass = findVerifiedIntensity(rgba);
  if (intensityClass) return { status: "RAIN", intensityClass };
  return { status: "UNKNOWN_PIXEL", intensityClass: null };
}
