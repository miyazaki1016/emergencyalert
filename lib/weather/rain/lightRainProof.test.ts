import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { scanJmaTileAtLeast1mm } from "./lightRainProof";

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
