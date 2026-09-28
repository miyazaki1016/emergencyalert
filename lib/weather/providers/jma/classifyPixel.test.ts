import { describe, expect, it } from "vitest";
import { classifyRainPixel } from "./classifyPixel";

describe("classifyRainPixel", () => {
  it("treats a fully transparent JMA precipitation pixel as no rain", () => {
    expect(classifyRainPixel({ r: 0, g: 0, b: 0, a: 0 })).toEqual({
      status: "NO_RAIN", intensityClass: null,
    });
  });
  it("treats transparent pixels as no rain regardless of hidden RGB channels", () => {
    expect(classifyRainPixel({ r: 255, g: 255, b: 255, a: 0 })).toEqual({
      status: "NO_RAIN", intensityClass: null,
    });
  });
  it("recognises a directly confirmed current JMA legend color", () => {
    expect(classifyRainPixel({ r: 255, g: 153, b: 0, a: 255 })).toEqual({
      status: "RAIN", intensityClass: "30_TO_50",
    });
  });
  it("recognises verified JMA PNG yellow as 20_TO_30", () => {
    expect(classifyRainPixel({ r: 250, g: 245, b: 0, a: 255 })).toEqual({
      status: "RAIN", intensityClass: "20_TO_30",
    });
  });
  it("never turns an unknown opaque pixel into dry", () => {
    expect(classifyRainPixel({ r: 1, g: 2, b: 3, a: 255 }).status).toBe("UNKNOWN_PIXEL");
  });
});
