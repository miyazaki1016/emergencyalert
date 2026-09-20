import type { RainIntensityClass, Rgba } from "../../types";

export interface VerifiedPaletteEntry {
  rgba: Rgba;
  intensityClass: RainIntensityClass;
  evidence: "CURRENT_JMA_ASSET";
}

export const VERIFIED_JMA_PNG_PALETTE: readonly VerifiedPaletteEntry[] = [
  { rgba: { r: 242, g: 242, b: 255, a: 255 }, intensityClass: "LT_1", evidence: "CURRENT_JMA_ASSET" },
  { rgba: { r: 250, g: 245, b: 0, a: 255 }, intensityClass: "20_TO_30", evidence: "CURRENT_JMA_ASSET" },
  { rgba: { r: 255, g: 40, b: 0, a: 255 }, intensityClass: "50_TO_80", evidence: "CURRENT_JMA_ASSET" },
];

export function findVerifiedIntensity(rgba: Rgba): RainIntensityClass | null {
  return VERIFIED_JMA_PNG_PALETTE.find(
    (entry) =>
      entry.rgba.r === rgba.r &&
      entry.rgba.g === rgba.g &&
      entry.rgba.b === rgba.b &&
      entry.rgba.a === rgba.a,
  )?.intensityClass ?? null;
}
