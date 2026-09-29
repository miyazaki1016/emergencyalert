import { describe, expect, it } from "vitest";
import type { HeavyRainPolygon } from "./nationalHeavyRain";
import { affectedAdministrativeAreas, type AdministrativeArea } from "./administrativeAreas";

const rain = (west: number, south: number, east: number, north: number): HeavyRainPolygon => ({
  type: "Polygon",
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

const area = (code: string, municipality: string, west: number, south: number, east: number, north: number): AdministrativeArea => ({
  code, prefecture: "東京都", municipality,
  geometry: { type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] },
});

describe("affectedAdministrativeAreas", () => {
  it("matches rain fully inside a municipality", () => {
    const ota = area("13111", "大田区", 139.6, 35.5, 139.9, 35.7);
    expect(affectedAdministrativeAreas([rain(139.7, 35.55, 139.75, 35.6)], [ota])).toEqual([ota]);
  });

  it("matches both municipalities when rain crosses their boundary", () => {
    const a = area("A", "A市", 139.0, 35.0, 139.5, 35.5);
    const b = area("B", "B市", 139.5, 35.0, 140.0, 35.5);
    expect(affectedAdministrativeAreas([rain(139.4, 35.2, 139.6, 35.3)], [a, b])).toEqual([a, b]);
  });

  it("does not match disjoint collinear boundaries", () => {
    const left = area("L", "L市", 0, 0, 1, 1);
    expect(affectedAdministrativeAreas([rain(2, 0, 3, 1)], [left])).toEqual([]);
  });

  it("matches boundaries that actually touch", () => {
    const left = area("L", "L市", 0, 0, 1, 1);
    expect(affectedAdministrativeAreas([rain(1, 0.25, 2, 0.75)], [left])).toEqual([left]);
  });

  it("does not match a distant municipality", () => {
    const distant = area("D", "D市", 140.0, 36.0, 140.5, 36.5);
    expect(affectedAdministrativeAreas([rain(139.0, 35.0, 139.1, 35.1)], [distant])).toEqual([]);
  });
});
