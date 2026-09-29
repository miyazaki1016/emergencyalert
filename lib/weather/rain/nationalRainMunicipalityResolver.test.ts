import { describe, expect, it, vi } from "vitest";
import type { AdministrativeArea } from "./administrativeAreas";
import type { HeavyRainPolygon } from "./nationalHeavyRain";
import { resolveNationalRainMunicipalities } from "./nationalRainMunicipalityResolver";
import type { N03PrefectureIndexEntry } from "./n03Prefectures";

const index: N03PrefectureIndexEntry[] = [
  { code: "13", name: "東京都", bbox: [139, 35, 140, 36] },
  { code: "14", name: "神奈川県", bbox: [139.4, 35, 140, 35.7] },
];

function rain(west: number, south: number, east: number, north: number): HeavyRainPolygon {
  return {
    type: "Polygon",
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
  };
}

function area(
  code: string,
  prefecture: string,
  municipality: string,
  west: number,
  south: number,
  east: number,
  north: number,
): AdministrativeArea {
  return {
    code,
    prefecture,
    municipality,
    geometry: {
      type: "Polygon",
      coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
    },
  };
}

describe("resolveNationalRainMunicipalities", () => {
  it("selects prefectures before loading detailed N03 areas", async () => {
    const loader = vi.fn(async () => [
      area("13111", "東京都", "大田区", 139.6, 35.5, 139.8, 35.7),
      area("14130", "神奈川県", "川崎市", 139.55, 35.45, 139.75, 35.65),
    ]);

    const result = await resolveNationalRainMunicipalities(
      [rain(139.62, 35.52, 139.64, 35.54)],
      loader,
      index,
    );

    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader.mock.calls[0][0].map((prefecture) => prefecture.code)).toEqual(["13", "14"]);
    expect(result).toEqual([
      { code: "13111", prefecture: "東京都", municipality: "大田区" },
      { code: "14130", prefecture: "神奈川県", municipality: "川崎市" },
    ]);
  });

  it("does not load N03 detail when the footprint is empty", async () => {
    const loader = vi.fn(async () => []);
    await expect(resolveNationalRainMunicipalities([], loader, index)).resolves.toEqual([]);
    expect(loader).not.toHaveBeenCalled();
  });

  it("does not load N03 detail when no prefecture bbox matches", async () => {
    const loader = vi.fn(async () => []);
    await expect(
      resolveNationalRainMunicipalities([rain(130, 30, 130.1, 30.1)], loader, index),
    ).resolves.toEqual([]);
    expect(loader).not.toHaveBeenCalled();
  });
});
