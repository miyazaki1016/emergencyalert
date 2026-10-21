import { describe, expect, it } from "vitest";
import { n03FeatureToAdministrativeArea, parseN03FeatureCollection, type N03Feature } from "./n03AdministrativeAreas";

const polygon = [[[139.7, 35.5], [139.8, 35.5], [139.8, 35.6], [139.7, 35.6], [139.7, 35.5]]];

function feature(code = "13111"): N03Feature {
  return {
    type: "Feature",
    properties: { N03_001: "東京都", N03_004: "大田区", N03_007: code },
    geometry: { type: "Polygon", coordinates: polygon },
  };
}

describe("N03 administrative area adapter", () => {
  it("maps official N03 property names to the internal model", () => {
    expect(n03FeatureToAdministrativeArea(feature())).toMatchObject({
      code: "13111", prefecture: "東京都", municipality: "大田区",
    });
  });

  it("merges multiple geometry features with the same municipality code", () => {
    const areas = parseN03FeatureCollection({ type: "FeatureCollection", features: [feature(), feature()] });
    expect(areas).toHaveLength(1);
    expect(areas[0].geometry.type).toBe("MultiPolygon");
    expect((areas[0].geometry.coordinates as number[][][][])).toHaveLength(2);
  });

  it("ignores incomplete features rather than inventing administrative identity", () => {
    const invalid = feature();
    invalid.properties = { N03_001: "東京都", N03_004: "大田区" };
    expect(n03FeatureToAdministrativeArea(invalid)).toBeNull();
  });
});
