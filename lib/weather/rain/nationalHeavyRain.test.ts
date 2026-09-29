import { describe, expect, it } from "vitest";
import { clusterHeavyRainCandidates, heavyRainAreaPolygons, heavyRainFootprint, heavyRainLevel, type HeavyRainCandidate } from "./nationalHeavyRain";

describe("heavyRainLevel", () => {
  it("publishes only JMA heavy-rain classes", () => {
    expect(heavyRainLevel("20_TO_30")).toBeNull();
    expect(heavyRainLevel("30_TO_50")).toBe("HEAVY");
    expect(heavyRainLevel("50_TO_80")).toBe("VERY_HEAVY");
    expect(heavyRainLevel("GTE_80")).toBe("TORRENTIAL");
  });
});

describe("clusterHeavyRainCandidates", () => {
  const candidate = (latitude: number, longitude: number, level: HeavyRainCandidate["level"] = "HEAVY"): HeavyRainCandidate => ({
    tileX: 0, tileY: 0, pixelX: 0, pixelY: 0, latitude, longitude,
    intensityClass: level === "TORRENTIAL" ? "GTE_80" : level === "VERY_HEAVY" ? "50_TO_80" : "30_TO_50",
    level,
  });

  it("groups nearby candidates and keeps separate rain areas apart", () => {
    const clusters = clusterHeavyRainCandidates([
      candidate(35.68, 139.76),
      candidate(35.70, 139.78, "VERY_HEAVY"),
      candidate(34.69, 135.50),
    ], 35);
    expect(clusters).toHaveLength(2);
    expect(clusters.find((c) => c.candidates.length === 2)?.level).toBe("VERY_HEAVY");
  });
});


describe("heavyRainFootprint", () => {
  it("preserves refined candidate coordinates as GeoJSON longitude-latitude points", () => {
    const candidate = {
      tileX: 1, tileY: 2, pixelX: 3, pixelY: 4,
      latitude: 35.68, longitude: 139.76,
      intensityClass: "30_TO_50", level: "HEAVY",
    } as HeavyRainCandidate;
    expect(heavyRainFootprint([candidate])).toEqual({
      type: "MultiPoint",
      coordinates: [[139.76, 35.68]],
    });
  });
});


describe("heavyRainAreaPolygons", () => {
  const candidate = (pixelX: number, pixelY: number, latitude: number, longitude: number): HeavyRainCandidate => ({
    tileX: 1, tileY: 2, pixelX, pixelY, latitude, longitude,
    intensityClass: "30_TO_50", level: "HEAVY",
  });

  it("groups adjacent strong pixels and keeps separate areas apart", () => {
    const polygons = heavyRainAreaPolygons([
      candidate(10, 10, 35.0, 139.0),
      candidate(11, 10, 35.0, 139.1),
      candidate(50, 50, 36.0, 140.0),
    ]);
    expect(polygons).toHaveLength(2);
    expect(polygons[0]).toEqual({
      type: "Polygon",
      coordinates: [[[139.0, 35.0], [139.1, 35.0], [139.1, 35.0], [139.0, 35.0], [139.0, 35.0]]],
    });
  });
});
