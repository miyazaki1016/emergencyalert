import type { RainIntensityClass, Rgba } from "../../types";

export interface VerifiedPaletteEntry {
  rgba: Rgba;
  intensityClass: RainIntensityClass;
  evidence: {
    grib2Sample: string;
    validTime: string;
    note: string;
  };
}

/**
 * Intentionally empty until an official JMA GRIB2 sample and its corresponding
 * PNG pixel have been compared. 2023 RGB values must not be copied here.
 */
export const VERIFIED_JMA_PNG_PALETTE: readonly VerifiedPaletteEntry[] = [];

export function findVerifiedIntensity(rgba: Rgba): RainIntensityClass | null {
  const match = VERIFIED_JMA_PNG_PALETTE.find(
    (entry) =>
      entry.rgba.r === rgba.r &&
      entry.rgba.g === rgba.g &&
      entry.rgba.b === rgba.b &&
      entry.rgba.a === rgba.a,
  );
  return match?.intensityClass ?? null;
}
