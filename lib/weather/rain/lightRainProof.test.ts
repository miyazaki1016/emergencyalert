import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { scanJmaTileAtLeast1mm, locateJmaRainPixelsAtLeast1mm } from "./lightRainProof";

function pngWithPixels(colors: Array<[number, number, number, number]>): Buffer {
  const png = new PNG({ width: colors.length, height: 1 });
  colors.forEach((color, index) => color.forEach((channel, offset) => {
    png.data[index * 4 + offset] = channel;
  }));
  return PNG.sync.write(png);
}

describe("isolated 1mm JMA rain proof", () => {
  it("counts verified 1mm rain, excludes sub-1mm, and preserves unknown", () => {
    const tile = pngWithPixels([
      [160, 210, 255, 255], // verified 1-5mm
      [242, 242, 255, 255], // verified below 1mm
      [255, 153, 0, 255], // verified 30-50mm
      [1, 2, 3, 255], // unrecognized, not dry
      [0, 0, 0, 0], // dry
    ]);
    expect(scanJmaTileAtLeast1mm(tile)).toEqual({
      rainPixels: 2, belowOnePixels: 1, unknownPixels: 1, sampledPixels: 5,
    });
  });
  it("does not skip odd-position rain pixels", () => {
    const tile = pngWithPixels([[0,0,0,0], [160,210,255,255], [0,0,0,0]]);
    expect(scanJmaTileAtLeast1mm(tile).rainPixels).toBe(1);
  });
});


describe("1mm geographic pixel locator", () => {
  it("keeps each rainy pixel and yields bounded geographic coordinates", () => {
    const tile = new PNG({ width: 256, height: 256 });
    tile.data.fill(0);
    for (const [x, y] of [[1, 1], [255, 255]]) {
      const i = (y * 256 + x) * 4;
      tile.data.set([160, 210, 255, 255], i);
    }
    const points = locateJmaRainPixelsAtLeast1mm(PNG.sync.write(tile), 4, 14, 6);
    expect(points.map(p => [p.pixelX, p.pixelY])).toEqual([[1, 1], [255, 255]]);
    expect(points.every(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))).toBe(true);
  });
  it("fails closed on unknown colors", () => {
    const tile = new PNG({ width: 256, height: 256 });
    tile.data.fill(0);
    tile.data.set([1, 2, 3, 255], 0);
    expect(() => locateJmaRainPixelsAtLeast1mm(PNG.sync.write(tile), 4, 14, 6)).toThrow("Unrecognized JMA pixel");
  });
});
