import { describe, expect, it } from "vitest";
import { VERIFIED_JMA_PNG_PALETTE } from "./pngPalette";
import { compareObservedPalette } from "./paletteWatcher";

describe("JMA palette watcher", () => {
  it("reports unchanged only when independently observed mappings match", () => {
    const observed = VERIFIED_JMA_PNG_PALETTE.map(({ rgba, intensityClass }) => ({
      rgba,
      intensityClass,
    }));
    expect(compareObservedPalette(observed)).toEqual({ status: "UNCHANGED", changes: [] });
  });

  it("detects a changed RGB without promoting it", () => {
    const observed = VERIFIED_JMA_PNG_PALETTE.map(({ rgba, intensityClass }) => ({
      rgba: intensityClass === "30_TO_50" ? { r: 1, g: 2, b: 3, a: 255 } : rgba,
      intensityClass,
    }));
    const result = compareObservedPalette(observed);
    expect(result.status).toBe("CHANGE_DETECTED");
    expect(result.changes).toContainEqual({
      intensityClass: "30_TO_50",
      expected: { r: 255, g: 153, b: 0, a: 255 },
      observed: { r: 1, g: 2, b: 3, a: 255 },
    });
    expect(VERIFIED_JMA_PNG_PALETTE.find((x) => x.intensityClass === "30_TO_50")?.rgba)
      .toEqual({ r: 255, g: 153, b: 0, a: 255 });
  });

  it("detects newly observed or missing mappings", () => {
    const observed = VERIFIED_JMA_PNG_PALETTE
      .filter((x) => x.intensityClass !== "LT_1")
      .map(({ rgba, intensityClass }) => ({ rgba, intensityClass }));
    observed.push({ rgba: { r: 9, g: 9, b: 9, a: 255 }, intensityClass: "20_TO_30" });

    const result = compareObservedPalette(observed);
    expect(result.status).toBe("CHANGE_DETECTED");
    expect(result.changes.some((x) => x.intensityClass === "LT_1" && x.observed === null)).toBe(true);
    expect(result.changes.some((x) => x.intensityClass === "20_TO_30" && x.expected === null)).toBe(true);
  });
});
