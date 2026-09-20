import type { RainFrameStatus, RainIntensityClass, Rgba } from "../../types";

export interface PixelClassification {
  status: RainFrameStatus;
  intensityClass: RainIntensityClass | null;
}

/**
 * Deliberately conservative.
 *
 * The historical 2023 color table is NOT copied here. Until the current
 * JMA rendering palette is verified against an authoritative/current source,
 * an opaque unrecognised pixel remains UNKNOWN_PIXEL.
 *
 * Transparent pixels are treated as NO_DATA, never NO_RAIN.
 */
export function classifyRainPixel(rgba: Rgba): PixelClassification {
  if (rgba.a === 0) return { status: "NO_DATA", intensityClass: null };

  return { status: "UNKNOWN_PIXEL", intensityClass: null };
}
