import { describe, expect, it } from "vitest";
import { VERIFIED_JMA_PNG_PALETTE, findVerifiedIntensity } from "./pngPalette";

describe("verified JMA PNG palette", () => {
  it("contains only explicitly evidence-gated current JMA mappings", () => {
    expect(VERIFIED_JMA_PNG_PALETTE.length).toBeGreaterThan(0);
    expect(VERIFIED_JMA_PNG_PALETTE.every((entry) => entry.evidence === "CURRENT_JMA_ASSET")).toBe(true);
  });

  it("recognises a verified current JMA color", () => {
    expect(findVerifiedIntensity({ r: 250, g: 245, b: 0, a: 255 })).toBe("20_TO_30");
  });

  it("does not classify an old unverified opaque color", () => {
    expect(findVerifiedIntensity({ r: 255, g: 153, b: 0, a: 255 })).toBeNull();
  });
});
