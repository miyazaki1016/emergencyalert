import { describe, expect, it } from "vitest";
import { clusterHeavyRainCandidates, heavyRainAreaPolygons, excludeCurrentHeavyRain, heavyRainFootprint, heavyRainLevel, type HeavyRainCandidate } from "./nationalHeavyRain";

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
  const candidate = (pixelX: number, pixelY: number, tileX = 1, tileY = 2): HeavyRainCandidate => ({
    tileX, tileY, pixelX, pixelY, latitude: 35, longitude: 139,
    intensityClass: "30_TO_50", level: "HEAVY",
  });

  it("merges adjacent cells into one exact outer boundary", () => {
    const polygons = heavyRainAreaPolygons([candidate(10, 10), candidate(11, 10)], 8);
    expect(polygons).toHaveLength(1);
    expect(polygons[0].coordinates).toHaveLength(1);
    expect(polygons[0].coordinates[0]).toHaveLength(5);
  });

  it("reduces a dense tile to its exact four corners without changing extent", () => {
    const cells: HeavyRainCandidate[] = [];
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) cells.push(candidate(x, y));
    const ring = heavyRainAreaPolygons(cells, 8)[0].coordinates[0];
    const firstCell = heavyRainAreaPolygons([candidate(0, 0)], 8)[0].coordinates[0];
    const lastCell = heavyRainAreaPolygons([candidate(255, 255)], 8)[0].coordinates[0];
    const west = Math.min(...firstCell.map(p => p[0]));
    const north = Math.max(...firstCell.map(p => p[1]));
    const east = Math.max(...lastCell.map(p => p[0]));
    const south = Math.min(...lastCell.map(p => p[1]));
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
    expect(ring.slice(0, -1)).toEqual(expect.arrayContaining([[west, north], [east, north], [east, south], [west, south]]));
  });

  it("keeps the dry center of a raster ring as a hole", () => {
    const cells: HeavyRainCandidate[] = [];
    for (let y = 10; y < 13; y++) for (let x = 10; x < 13; x++) {
      if (!(x === 11 && y === 11)) cells.push(candidate(x, y));
    }
    const polygons = heavyRainAreaPolygons(cells, 8);
    expect(polygons).toHaveLength(1);
    expect(polygons[0].coordinates).toHaveLength(2);
    expect(polygons[0].coordinates.map(ring => ring.length)).toEqual([5, 5]);
  });

  it("does not fill the missing dry cell in an L shape", () => {
    const polygons = heavyRainAreaPolygons([candidate(10, 10), candidate(11, 10), candidate(10, 11)], 8);
    expect(polygons).toHaveLength(1);
    expect(polygons[0].coordinates[0].length).toBeGreaterThan(5);
  });

  it("joins cells across a tile boundary using world pixel coordinates", () => {
    const polygons = heavyRainAreaPolygons([
      candidate(255, 10, 1, 2),
      candidate(0, 10, 2, 2),
    ], 8);
    expect(polygons).toHaveLength(1);
  });

  it("keeps separated cells as separate polygons", () => {
    expect(heavyRainAreaPolygons([candidate(10, 10), candidate(50, 50)], 8)).toHaveLength(2);
  });

  it("deduplicates repeated raster cells before tracing boundaries", () => {
    const cell = candidate(10, 10);
    const polygons = heavyRainAreaPolygons([cell, cell], 8);
    expect(polygons).toHaveLength(1);
    expect(polygons[0].coordinates).toHaveLength(1);
  });

  it("keeps diagonally touching cells as separate rain polygons", () => {
    expect(heavyRainAreaPolygons([candidate(10, 10), candidate(11, 11)], 8)).toHaveLength(2);
  });

  it("returns no polygons for an empty candidate set", () => {
    expect(heavyRainAreaPolygons([], 8)).toEqual([]);
  });
});


describe("excludeCurrentHeavyRain", () => {
  const candidate = (tileX: number, tileY: number, pixelX: number, pixelY: number): HeavyRainCandidate => ({
    tileX, tileY, pixelX, pixelY, latitude: 35, longitude: 139,
    intensityClass: "30_TO_50", level: "HEAVY",
  });

  it("keeps only high-resolution cells that are not already heavy now", () => {
    const current = [candidate(100, 50, 10, 20), candidate(100, 50, 11, 20)];
    const forecast = [candidate(100, 50, 10, 20), candidate(100, 50, 12, 20)];
    expect(excludeCurrentHeavyRain(forecast, current)).toEqual([forecast[1]]);
  });

  it("distinguishes the same local pixel coordinates in different tiles", () => {
    const current = [candidate(100, 50, 10, 20)];
    const forecast = [candidate(101, 50, 10, 20)];
    expect(excludeCurrentHeavyRain(forecast, current)).toEqual(forecast);
  });
});
