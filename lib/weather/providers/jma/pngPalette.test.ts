import { describe, expect, it } from "vitest";
import { findVerifiedIntensity, VERIFIED_JMA_PNG_PALETTE } from "./pngPalette";

describe("verified JMA PNG palette", () => {
  it("starts with no guessed RGB mappings", () => {
    expect(VERIFIED_JMA_PNG_PALETTE).toHaveLength(0);
  });

  it("does not classify an unverified opaque pixel", () => {
    expect(findVerifiedIntensity({ r: 33, g: 140, b: 255, a: 255 })).toBeNull();
  });
});
