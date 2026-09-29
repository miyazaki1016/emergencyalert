import { describe, expect, it } from "vitest";
import type { AdministrativeArea } from "./administrativeAreas";
import { municipalitiesForNationalRainFootprint } from "./nationalRainMunicipalities";
import type { HeavyRainPolygon } from "./nationalHeavyRain";

function area(code: string, municipality: string, west: number, south: number, east: number, north: number): AdministrativeArea {
  return {
    code,
    prefecture: "東京都",
    municipality,
    geometry: { type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] },
  };
}

function rain(west: number, south: number, east: number, north: number): HeavyRainPolygon {
  return { type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] };
}

describe("municipalitiesForNationalRainFootprint", () => {
  it("maps worker footprint to intersecting municipalities only", () => {
    const hit = area("13111", "大田区", 139.6, 35.5, 139.8, 35.7);
    const miss = area("13113", "渋谷区", 139.65, 35.65, 139.75, 35.75);
    expect(municipalitiesForNationalRainFootprint([rain(139.62, 35.52, 139.64, 35.54)], [hit, miss])).toEqual([
      { code: "13111", prefecture: "東京都", municipality: "大田区" },
    ]);
  });

  it("preserves N03 input order for multiple matches", () => {
    const east = area("E", "東市", 140, 35, 141, 36);
    const west = area("W", "西市", 139, 35, 140, 36);
    expect(municipalitiesForNationalRainFootprint([rain(139.5, 35.2, 140.5, 35.8)], [east, west]).map((x) => x.code)).toEqual(["E", "W"]);
  });
});
