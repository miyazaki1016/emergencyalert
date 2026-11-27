import { PNG } from "pngjs";
import { describe, expect, it, vi } from "vitest";
import { collectCaseObservations, observedTileTier } from "./nationalRainCaseObservations";
import { MASK_BYTES } from "./lightRainPixelMasks";

function image(...pixels: number[][]) {
  const png = new PNG({ width: 256, height: 256 });
  png.data.fill(0);
  pixels.forEach((pixel, index) => png.data.set(pixel, index * 4));
  return PNG.sync.write(png);
}

const mask = new Uint8Array(MASK_BYTES);
mask[0] = 1;
const wet = image([255, 40, 0, 255]);
const dry = image([0, 0, 0, 0], [180, 0, 104, 255]);
const unclassified = image([50, 25, 12, 255]);

describe("rain case observations", () => {
  it("uses only pixels within the municipality mask and separates dry from unrecognized", () => {
    expect(observedTileTier(wet, mask)).toBe(50);
    expect(observedTileTier(dry, mask)).toBe(0);
    expect(observedTileTier(unclassified, mask)).toBeNull();
  });

  it("uses the exact published valid time and requires every municipality tile", async () => {
    const times = ["2026-11-28T03:00:00.000Z", "2026-11-28T03:05:00.000Z", "2026-11-28T03:10:00.000Z"];
    const readTile = vi.fn(async (stamp: string, x: number) =>
      stamp === "20261128030500" && x === 2 ? null : x === 1 ? wet : dry);
    const result = await collectCaseObservations({
      validTimes: [...times, times[0]],
      published: new Set(["20261128030000", "20261128030500"]),
      masks: [{ x: 1, y: 0, mask }, { x: 2, y: 0, mask }],
      readTile, signal: new AbortController().signal,
    });
    expect(result).toEqual({ [times[0]]: 50, [times[1]]: null, [times[2]]: null });
    expect(readTile).toHaveBeenCalledTimes(4);
  });
});
