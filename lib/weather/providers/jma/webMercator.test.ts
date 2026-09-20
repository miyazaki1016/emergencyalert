import { describe, expect, it } from "vitest";
import { latLonToTilePixel } from "./webMercator";

describe("latLonToTilePixel", () => {
  it("matches the verified Tokyo Station z10 reference", () => {
    expect(latLonToTilePixel(35.681236, 139.767125, 10)).toEqual({
      zoom: 10,
      tileX: 909,
      tileY: 403,
      pixelX: 143,
      pixelY: 58,
    });
  });

  it("rejects invalid coordinates", () => {
    expect(() => latLonToTilePixel(91, 139, 10)).toThrow();
    expect(() => latLonToTilePixel(35, 181, 10)).toThrow();
  });
});
