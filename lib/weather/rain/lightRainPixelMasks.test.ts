import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { locateJmaRainPixelsAtLeast1mm } from "./lightRainProof";
import {
  affectedAdministrativeAreas,
  type AdministrativeArea,
} from "./lightRainAdministrativeAreas";
import { municipalitiesForLightRainTile } from "./lightRainMunicipalities";
import {
  MASK_BYTES,
  matchHeavyRainPixelsToMasks,
  PIXELS_PER_TILE,
  computeAreaPixelMask,
  computeAreaPixelMaskFast,
  decodeTilePixelMasks,
  encodeTilePixelMasks,
  maskHasPixel,
  municipalitiesForLightRainTileWithMasks,
  pixelFootprint,
  type TilePixelMasks,
} from "./lightRainPixelMasks";

// Geometry helpers in the same slippy-map terms as the production matcher.
const size = (zoom: number) => 256 * 2 ** zoom;
const lon = (zoom: number, x: number) => x / size(zoom) * 360 - 180;
const lat = (zoom: number, y: number) =>
  Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / size(zoom))) * 180 / Math.PI;
/** Rectangle covering global pixels [gx0..gx1] x [gy0..gy1] exactly. */
const rectArea = (
  code: string, zoom: number, gx0: number, gy0: number, gx1: number, gy1: number,
): AdministrativeArea => ({
  code, prefecture: "検証県", municipality: `区域${code}`,
  geometry: {
    type: "Polygon",
    coordinates: [[
      [lon(zoom, gx0), lat(zoom, gy0)], [lon(zoom, gx1 + 1), lat(zoom, gy0)],
      [lon(zoom, gx1 + 1), lat(zoom, gy1 + 1)], [lon(zoom, gx0), lat(zoom, gy1 + 1)],
      [lon(zoom, gx0), lat(zoom, gy0)],
    ]],
  },
});

function rainTile(pixels: Array<[number, number]>): Buffer {
  const tile = new PNG({ width: 256, height: 256 });
  tile.data.fill(0);
  for (const [px, py] of pixels) {
    tile.data.set([160, 210, 255, 255], (py * 256 + px) * 4);
  }
  return PNG.sync.write(tile);
}

function masksFor(zoom: number, tileX: number, tileY: number, areas: AdministrativeArea[]): TilePixelMasks {
  return {
    zoom, tileX, tileY,
    entries: areas.map((area) => ({ code: area.code, mask: computeAreaPixelMask(zoom, tileX, tileY, area) })),
  };
}

describe("precomputed pixel masks (Issue #220)", () => {
  const zoom = 4, tileX = 14, tileY = 6;
  const gx = tileX * 256, gy = tileY * 256;

  it("reproduces the production matcher for every pixel of a tile (plain area)", () => {
    const area = rectArea("a1", zoom, gx + 10, gy + 20, gx + 60, gy + 90);
    const mask = computeAreaPixelMask(zoom, tileX, tileY, area);
    for (let py = 0; py < 256; py++) {
      for (let px = 0; px < 256; px++) {
        const expected = affectedAdministrativeAreas(
          [pixelFootprint(zoom, tileX, tileY, px, py)], [area],
        ).length > 0;
        expect(maskHasPixel(mask, py * 256 + px), `pixel ${px},${py}`).toBe(expected);
      }
    }
  });

  it("keeps hole pixels empty while the surrounding ring matches", () => {
    const outer = rectArea("hole", zoom, gx + 30, gy + 30, gx + 90, gy + 90);
    const holeRing: number[][] = [
      [lon(zoom, gx + 50), lat(zoom, gy + 50)], [lon(zoom, gx + 71), lat(zoom, gy + 50)],
      [lon(zoom, gx + 71), lat(zoom, gy + 71)], [lon(zoom, gx + 50), lat(zoom, gy + 71)],
      [lon(zoom, gx + 50), lat(zoom, gy + 50)],
    ];
    (outer.geometry.coordinates as number[][][]).push(holeRing);
    const mask = computeAreaPixelMask(zoom, tileX, tileY, outer);
    // Center of the hole: no intersection. Ring body: intersection.
    expect(maskHasPixel(mask, 60 * 256 + 60)).toBe(false);
    expect(maskHasPixel(mask, 40 * 256 + 40)).toBe(true);
    // Full-tile parity against the production matcher.
    for (let py = 0; py < 256; py++) {
      for (let px = 0; px < 256; px++) {
        const expected = affectedAdministrativeAreas(
          [pixelFootprint(zoom, tileX, tileY, px, py)], [outer],
        ).length > 0;
        expect(maskHasPixel(mask, py * 256 + px), `pixel ${px},${py}`).toBe(expected);
      }
    }
  });

  it("covers disjoint MultiPolygon islands and exact edge contact", () => {
    const islandA = rectArea("mp", zoom, gx + 5, gy + 5, gx + 20, gy + 20);
    const islandB = rectArea("mp", zoom, gx + 200, gy + 180, gx + 240, gy + 230);
    const multi: AdministrativeArea = {
      code: "mp", prefecture: "検証県", municipality: "離島町",
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          (islandA.geometry.coordinates as number[][][]),
          (islandB.geometry.coordinates as number[][][]),
        ],
      },
    };
    const mask = computeAreaPixelMask(zoom, tileX, tileY, multi);
    expect(maskHasPixel(mask, 10 * 256 + 10)).toBe(true);
    expect(maskHasPixel(mask, 200 * 256 + 210)).toBe(true);
    expect(maskHasPixel(mask, 100 * 256 + 100)).toBe(false);
    // An area ending exactly on a pixel edge touches both neighbouring
    // pixels; the production matcher counts contact as intersection.
    const touching = rectArea("edge", zoom, gx + 40, gy + 40, gx + 40, gy + 40);
    const edgeMask = computeAreaPixelMask(zoom, tileX, tileY, touching);
    expect(maskHasPixel(edgeMask, 40 * 256 + 40)).toBe(true);
    expect(maskHasPixel(edgeMask, 40 * 256 + 39)).toBe(true);
    expect(maskHasPixel(edgeMask, 40 * 256 + 41)).toBe(true);
    expect(maskHasPixel(edgeMask, 39 * 256 + 40)).toBe(true);
    expect(maskHasPixel(edgeMask, 41 * 256 + 40)).toBe(true);
  });

  it("matches the production tile matcher end to end on changing rain frames", () => {
    const areas = [
      rectArea("e1", zoom, gx + 10, gy + 10, gx + 80, gy + 120),
      rectArea("e2", zoom, gx + 100, gy + 100, gx + 200, gy + 200),
      rectArea("e3", zoom, gx + 220, gy + 20, gx + 250, gy + 60),
    ];
    const masks = masksFor(zoom, tileX, tileY, areas);
    const frames: Array<Array<[number, number]>> = [
      [],
      [[15, 15]],
      [[15, 15], [150, 150], [230, 30]],
      [[90, 90], [201, 201]],
      [[255, 255], [0, 0], [85, 125]],
    ];
    for (const frame of frames) {
      const tile = rainTile(frame);
      expect(municipalitiesForLightRainTileWithMasks(tile, zoom, tileX, tileY, masks, areas))
        .toEqual(municipalitiesForLightRainTile(tile, zoom, tileX, tileY, areas));
    }
  });

  it("round-trips through the binary format and rejects corrupt data", () => {
    const area = rectArea("rt", zoom, gx + 3, gy + 3, gx + 30, gy + 30);
    const masks = masksFor(zoom, tileX, tileY, [area]);
    const decoded = decodeTilePixelMasks(encodeTilePixelMasks(masks));
    expect(decoded.zoom).toBe(zoom);
    expect(decoded.tileX).toBe(tileX);
    expect(decoded.tileY).toBe(tileY);
    expect(decoded.entries).toHaveLength(1);
    expect(decoded.entries[0].code).toBe("rt");
    expect(Buffer.from(decoded.entries[0].mask).equals(Buffer.from(masks.entries[0].mask))).toBe(true);
    expect(decoded.entries[0].mask.length).toBe(MASK_BYTES);
    expect(PIXELS_PER_TILE).toBe(65536);

    const corrupt = Buffer.from(encodeTilePixelMasks(masks));
    corrupt[0] = 0x58;
    expect(() => decodeTilePixelMasks(corrupt)).toThrow("PIXEL_MASK_BAD_MAGIC");
    const truncated = encodeTilePixelMasks(masks).subarray(0, 40);
    expect(() => decodeTilePixelMasks(Buffer.from(truncated))).toThrow("PIXEL_MASK_TRUNCATED");
  });

  it("fast exact path agrees with the reference path on every fixture", () => {
    const plain = rectArea("f1", zoom, gx + 10, gy + 20, gx + 60, gy + 90);
    const holed = rectArea("f2", zoom, gx + 30, gy + 30, gx + 90, gy + 90);
    (holed.geometry.coordinates as number[][][]).push([
      [lon(zoom, gx + 50), lat(zoom, gy + 50)], [lon(zoom, gx + 71), lat(zoom, gy + 50)],
      [lon(zoom, gx + 71), lat(zoom, gy + 71)], [lon(zoom, gx + 50), lat(zoom, gy + 71)],
      [lon(zoom, gx + 50), lat(zoom, gy + 50)],
    ]);
    const islandA = rectArea("f3", zoom, gx + 5, gy + 5, gx + 20, gy + 20);
    const islandB = rectArea("f3", zoom, gx + 200, gy + 180, gx + 240, gy + 230);
    const multi: AdministrativeArea = {
      code: "f3", prefecture: "検証県", municipality: "離島町",
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          (islandA.geometry.coordinates as number[][][]),
          (islandB.geometry.coordinates as number[][][]),
        ],
      },
    };
    const touching = rectArea("f4", zoom, gx + 40, gy + 40, gx + 40, gy + 40);
    // Slanted, concave polygon: exercises the segment grid and the hoisted
    // ray casting on non-axis-aligned edges.
    const slanted: AdministrativeArea = {
      code: "f5", prefecture: "検証県", municipality: "斜辺町",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [lon(zoom, gx + 20.3), lat(zoom, gy + 100.7)],
          [lon(zoom, gx + 120.9), lat(zoom, gy + 30.2)],
          [lon(zoom, gx + 210.4), lat(zoom, gy + 150.6)],
          [lon(zoom, gx + 130.5), lat(zoom, gy + 120.1)],
          [lon(zoom, gx + 90.8), lat(zoom, gy + 190.3)],
          [lon(zoom, gx + 20.3), lat(zoom, gy + 100.7)],
        ]],
      },
    };
    for (const area of [plain, holed, multi, touching, slanted]) {
      const reference = computeAreaPixelMask(zoom, tileX, tileY, area);
      const fast = computeAreaPixelMaskFast(zoom, tileX, tileY, area);
      expect(Buffer.from(fast).equals(Buffer.from(reference)), `area ${area.code}`).toBe(true);
    }
  });

  it("fails closed when a tile has no mask set", () => {
    const area = rectArea("m1", zoom, gx + 3, gy + 3, gx + 30, gy + 30);
    const tile = rainTile([[10, 10]]);
    expect(() => municipalitiesForLightRainTileWithMasks(tile, zoom, tileX, tileY, undefined, [area]))
      .toThrow("PIXEL_MASK_MISSING");
    const wrongTile = masksFor(zoom, tileX + 1, tileY, [area]);
    expect(() => municipalitiesForLightRainTileWithMasks(tile, zoom, tileX, tileY, wrongTile, [area]))
      .toThrow("PIXEL_MASK_MISSING");
  });
});

it("retains odd pixels at 30 mm/h, excludes 20–30 mm/h, and reports the highest tier per municipality", () => {
  const z = 10, x = 885, y = 407;
  const gx = x * 256, gy = y * 256;
  const areas = [rectArea("a", z, gx, gy, gx + 10, gy + 10),
    rectArea("b", z, gx + 20, gy, gx + 30, gy + 10),
    rectArea("c", z, gx + 40, gy, gx + 50, gy + 10)];
  const png = new PNG({ width: 256, height: 256 });
  for (const [px, rgba] of [
    [1, [255, 153, 0, 255]], [21, [255, 40, 0, 255]],
    [23, [180, 0, 104, 255]], [41, [250, 245, 0, 255]],
  ] as const) png.data.set(rgba, (256 + px) * 4);
  const pixels = locateJmaRainPixelsAtLeast1mm(PNG.sync.write(png), z, x, y);
  expect(matchHeavyRainPixelsToMasks(pixels, x, y, masksFor(z, x, y, areas), areas)
    .map(area => [area.code, area.minimumMmPerHour])).toEqual([["b", 80], ["a", 30]]);
});
