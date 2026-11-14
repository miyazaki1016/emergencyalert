import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { parseOfficialN03ForLightRain } from "./lightRainOfficialN03";
import { municipalitiesForLightRainTile } from "./lightRainMunicipalities";

describe("official N03 GeoJSON conversion to 1mm rain intersection", () => {
  it("merges split features for one municipality and resolves rain to its name", () => {
    const geometry = { type: "Polygon" as const, coordinates: [[
      [135, 0], [136, 0], [136, 1], [135, 1], [135, 0],
    ]] };
    const areas = parseOfficialN03ForLightRain({ type: "FeatureCollection", features: [
      { type: "Feature", properties: { N03_001: "北海道", N03_004: "札幌市", N03_005: "南区", N03_007: "01106" }, geometry },
      { type: "Feature", properties: { N03_001: "北海道", N03_004: "札幌市", N03_005: "南区", N03_007: "01106" }, geometry },
    ] });
    expect(areas).toHaveLength(1);
    expect(areas[0].geometry.type).toBe("MultiPolygon");
    const tile = new PNG({ width: 256, height: 256 });
    tile.data.fill(0);
    // Tile z4 x14 y7 covers 0..~21.9 degrees latitude; pixel 0 at ~21.9,
    // so use pixel y=255 near the equator, with matching polygon 0..1 degrees.
    tile.data.set([160, 210, 255, 255], (255 * 256) * 4);
    expect(municipalitiesForLightRainTile(PNG.sync.write(tile), 4, 14, 7, areas))
      .toEqual([{ code: "01106", prefecture: "北海道", municipality: "札幌市南区" }]);
  });
});
