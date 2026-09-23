import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { VERIFIED_JMA_PNG_PALETTE, findVerifiedIntensity } from "./pngPalette";
import { classifyRainPixel } from "./classifyPixel";

// Independently recorded from JMA's hrpns SVG and raw PNG on 2026-09-23.
const verified = [
  [242, 242, 255, "LT_1"],
  [160, 210, 255, "1_TO_5"],
  [33, 140, 255, "5_TO_10"],
  [0, 65, 255, "10_TO_20"],
  [255, 153, 0, "30_TO_50"],
  [255, 40, 0, "50_TO_80"],
  [180, 0, 104, "GTE_80"],
] as const;

describe("verified JMA PNG palette", () => {
  it("contains only explicitly evidence-gated current JMA mappings", () => {
    expect(VERIFIED_JMA_PNG_PALETTE).toHaveLength(7);
    expect(VERIFIED_JMA_PNG_PALETTE.every((entry) => entry.evidence === "CURRENT_JMA_ASSET")).toBe(true);
  });

  it.each(verified)("classifies raw RGB (%i,%i,%i) as %s", (r, g, b, band) => {
    expect(findVerifiedIntensity({ r, g, b, a: 255 })).toBe(band);
    expect(findVerifiedIntensity({ r, g, b, a: 191 })).toBeNull();
  });

  it.each([
    [250, 245, 0], // PNG yellow does not match the hrpns legend.
    [255, 245, 0], // Legend yellow is not corroborated by raw PNG pixels.
    [0, 170, 255], // AMeDAS rain10m circle, not hrpns.
    [255, 170, 0], // AMeDAS rain10m circle, not hrpns.
    [1, 2, 3],
  ])("keeps unsupported RGB (%i,%i,%i) UNKNOWN_PIXEL", (r, g, b) => {
    expect(classifyRainPixel({ r, g, b, a: 255 })).toEqual({ status: "UNKNOWN_PIXEL", intensityClass: null });
  });

  it("decodes corroborated colors from the archived native-zoom JMA PNG", () => {
    const png = PNG.sync.read(readFileSync("docs/evidence/jma-palette-2026-09-23/hrpns-20260923101500-10-891-411.png"));
    const colors = new Set<string>();
    let unresolvedYellow = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      const [r, g, b, a] = png.data.subarray(i, i + 4);
      colors.add(`${r},${g},${b},${a}`);
      if (r === 250 && g === 245 && b === 0 && a === 255) {
        expect(classifyRainPixel({ r, g, b, a }).status).toBe("UNKNOWN_PIXEL");
        unresolvedYellow++;
      }
    }
    for (const [r, g, b] of verified) expect(colors.has(`${r},${g},${b},255`)).toBe(true);
    expect(unresolvedYellow).toBe(562);
  });
});
