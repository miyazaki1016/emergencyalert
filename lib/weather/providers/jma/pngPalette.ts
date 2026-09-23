import type { RainIntensityClass, Rgba } from "../../types";

export interface VerifiedPaletteEntry {
  rgba: Rgba;
  intensityClass: RainIntensityClass;
  evidence: "CURRENT_JMA_ASSET";
}

// Evidence: docs/PNG_PALETTE_EVIDENCE.md (2026-09-23), hrpns legend + raw PNGs.
// 20_TO_30 is deliberately absent: SVG #FFF500 and PNG #FAF500 disagree.
// AMeDAS rain10m circle assets are not evidence for hrpns intensity.
export const VERIFIED_JMA_PNG_PALETTE: readonly VerifiedPaletteEntry[] = [
  { rgba: { r: 242, g: 242, b: 255, a: 255 }, intensityClass: "LT_1", evidence: "CURRENT_JMA_ASSET" },
  { rgba: { r: 160, g: 210, b: 255, a: 255 }, intensityClass: "1_TO_5", evidence: "CURRENT_JMA_ASSET" },
  { rgba: { r: 33, g: 140, b: 255, a: 255 }, intensityClass: "5_TO_10", evidence: "CURRENT_JMA_ASSET" },
  { rgba: { r: 0, g: 65, b: 255, a: 255 }, intensityClass: "10_TO_20", evidence: "CURRENT_JMA_ASSET" },
  { rgba: { r: 255, g: 153, b: 0, a: 255 }, intensityClass: "30_TO_50", evidence: "CURRENT_JMA_ASSET" },
  { rgba: { r: 255, g: 40, b: 0, a: 255 }, intensityClass: "50_TO_80", evidence: "CURRENT_JMA_ASSET" },
  { rgba: { r: 180, g: 0, b: 104, a: 255 }, intensityClass: "GTE_80", evidence: "CURRENT_JMA_ASSET" },
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
