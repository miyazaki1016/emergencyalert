import { describe, expect, it } from "vitest";
import { classifyRainPixel } from "./classifyPixel";

describe("classifyRainPixel", () => {
  it("fails closed on a fully transparent pixel until coverage semantics are verified", () => {
    expect(classifyRainPixel({ r: 0, g: 0, b: 0, a: 0 })).toEqual({
      status: "UNKNOWN_PIXEL", intensityClass: null,
    });
  });
  it("recognises a directly confirmed current JMA legend color", () => {
    expect(classifyRainPixel({ r: 255, g: 153, b: 0, a: 255 })).toEqual({
      status: "RAIN", intensityClass: "30_TO_50",
    });
  });
  it("withdraws yellow when current SVG and PNG evidence disagree", () => {
    expect(classifyRainPixel({ r: 250, g: 245, b: 0, a: 255 }).status).toBe("UNKNOWN_PIXEL");
  });
  it("never turns an unknown opaque pixel into dry", () => {
    expect(classifyRainPixel({ r: 1, g: 2, b: 3, a: 255 }).status).toBe("UNKNOWN_PIXEL");
  });
});
