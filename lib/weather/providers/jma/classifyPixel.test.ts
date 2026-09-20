import { describe, expect, it } from "vitest";
import { classifyRainPixel } from "./classifyPixel";

describe("classifyRainPixel", () => {
  it("never converts transparent/no-data pixels into no-rain", () => {
    expect(classifyRainPixel({ r: 0, g: 0, b: 0, a: 0 })).toEqual({
      status: "NO_DATA",
      intensityClass: null,
    });
  });

  it("keeps an unverified opaque color unknown", () => {
    expect(classifyRainPixel({ r: 242, g: 242, b: 255, a: 255 })).toEqual({
      status: "UNKNOWN_PIXEL",
      intensityClass: null,
    });
  });
});
