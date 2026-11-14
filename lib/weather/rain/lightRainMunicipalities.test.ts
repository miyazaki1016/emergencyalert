import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { municipalitiesForLightRainTile } from "./lightRainMunicipalities";
import { affectedAdministrativeAreas, type AdministrativeArea, type HeavyRainPolygon } from "./lightRainAdministrativeAreas";

describe("isolated 1mm N03 municipality intersection", () => {
  it("includes a municipality touched by a rainy pixel edge, not only its center", () => {
    const tile = new PNG({ width: 256, height: 256 });
    tile.data.fill(0);
    tile.data.set([160, 210, 255, 255], 0);
    // z4 tile (14,6), first pixel spans longitudes 135..135.087890625.
    // Thin N03 polygon near western pixel edge, away from its center.
    const area: AdministrativeArea = {
      code: "test-1", prefecture: "検証県", municipality: "境界市",
      geometry: { type: "Polygon", coordinates: [[
        [135.001, 44.99], [135.005, 44.99], [135.005, 45.0],
        [135.001, 45.0], [135.001, 44.99],
      ]] },
    };
    // Use a synthetic polygon centered inside the first pixel's real latitude bounds.
    const lat = (y: number) => Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / 4096)) * 180 / Math.PI;
    const north = lat(6 * 256), south = lat(6 * 256 + 1);
    area.geometry.coordinates = [[
      [135.001, south + 0.001], [135.005, south + 0.001],
      [135.005, north - 0.001], [135.001, north - 0.001],
      [135.001, south + 0.001],
    ]];
    expect(municipalitiesForLightRainTile(PNG.sync.write(tile), 4, 14, 6, [area]))
      .toEqual([{ code: "test-1", prefecture: "検証県", municipality: "境界市" }]);
  });
  it("reuses prepared N03 geometry across forecast frames without changing edge matches", () => {
    const tile = new PNG({ width: 256, height: 256 });
    tile.data.fill(0);
    tile.data.set([160, 210, 255, 255], 0);
    const lat = (y: number) => Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / 4096)) * 180 / Math.PI;
    const north = lat(6 * 256), south = lat(6 * 256 + 1);
    const area: AdministrativeArea = {
      code: "cache-edge", prefecture: "検証県", municipality: "沿岸市",
      geometry: { type: "Polygon", coordinates: [[
        [135.001, south + 0.001], [135.005, south + 0.001],
        [135.005, north - 0.001], [135.001, north - 0.001],
        [135.001, south + 0.001],
      ]] },
    };
    const buffer = PNG.sync.write(tile);
    const first = municipalitiesForLightRainTile(buffer, 4, 14, 6, [area]);
    const second = municipalitiesForLightRainTile(buffer, 4, 14, 6, [area]);
    expect(first).toEqual([{ code: "cache-edge", prefecture: "検証県", municipality: "沿岸市" }]);
    expect(second).toEqual(first);
    const dry = new PNG({ width: 256, height: 256 });
    dry.data.fill(0);
    expect(municipalitiesForLightRainTile(PNG.sync.write(dry), 4, 14, 6, [area])).toEqual([]);
  });
  it("matches the original footprint matcher across repeated changing rain frames", () => {
    const zoom = 4, tileX = 14, tileY = 6;
    const size = 256 * 2 ** zoom;
    const lon = (x: number) => x / size * 360 - 180;
    const lat = (y: number) => Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / size)) * 180 / Math.PI;
    const rect = (left: number, top: number, right: number, bottom: number) => [[
      [lon(left), lat(top)], [lon(right), lat(top)], [lon(right), lat(bottom)],
      [lon(left), lat(bottom)], [lon(left), lat(top)],
    ]];
    const areas: AdministrativeArea[] = [
      { code: "a", prefecture: "A", municipality: "A", geometry: {
        type: "Polygon", coordinates: rect(14 * 256, 6 * 256, 14 * 256 + 3, 6 * 256 + 3),
      } },
      { code: "b", prefecture: "B", municipality: "B", geometry: {
        type: "MultiPolygon", coordinates: [
          rect(14 * 256 + 5, 6 * 256 + 5, 14 * 256 + 8, 6 * 256 + 8),
          rect(14 * 256 + 9, 6 * 256 + 9, 14 * 256 + 12, 6 * 256 + 12),
        ],
      } },
    ];
    for (const rainy of [[[0, 0], [6, 6]], [[1, 1], [10, 10]], [[20, 20]], [[0, 0], [6, 6]]]) {
      const tile = new PNG({ width: 256, height: 256 });
      tile.data.fill(0);
      const footprints: HeavyRainPolygon[] = [];
      for (const [px, py] of rainy) {
        tile.data.set([160, 210, 255, 255], (py * 256 + px) * 4);
        const x = tileX * 256 + px, y = tileY * 256 + py;
        footprints.push({ coordinates: [[
          [lon(x), lat(y)], [lon(x + 1), lat(y)],
          [lon(x + 1), lat(y + 1)], [lon(x), lat(y + 1)], [lon(x), lat(y)],
        ]] });
      }
      const expected = affectedAdministrativeAreas(footprints, areas)
        .map(({ code, prefecture, municipality }) => ({ code, prefecture, municipality }));
      expect(municipalitiesForLightRainTile(PNG.sync.write(tile), zoom, tileX, tileY, areas))
        .toEqual(expected);
    }
  });
  it("returns no municipalities when no rain pixels exist", () => {
    const tile = new PNG({ width: 256, height: 256 });
    tile.data.fill(0);
    expect(municipalitiesForLightRainTile(PNG.sync.write(tile), 4, 14, 6, []))
      .toEqual([]);
  });
});
