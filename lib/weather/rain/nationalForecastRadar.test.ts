import { describe, expect, it } from "vitest";
import { forecastRadarPlayback } from "./nationalForecastRadar";
import type { NationalForecastFrame } from "./nationalForecastSnapshot";

const tile = { x: 860, y: 416 };
const base = "20261124090000";
const older = "20261124085500";

function fixtures(offset: number, hits: number[]): NationalForecastFrame[] {
  return Array.from({ length: 6 }, (_, i) => ({
    validTime: new Date(Date.UTC(2026, 10, 24, 9, offset + 5 * i)).toISOString(),
    municipalities: hits.includes(i) ? [{
      code: "13101", prefecture: "東京都", municipality: "千代田区",
      minimumMmPerHour: 30, radarTile: i === hits[0] ? tile : { ...tile, x: tile.x + 1 },
    }] : [],
    tileCoverage: [{ x: 13, y: 6, basetime: i === 0 ? older : base }],
  }));
}

describe("forecastRadarPlayback", () => {
  it.each([[5, [0, 1]], [5, [0, 1, 3]], [35, [1, 2, 3, 5]], [35, [4, 5]]] as const)(
    "uses five consecutive slots in the band starting at +%s",
    (offset, hits) => {
      const frames = fixtures(offset, [...hits]);
      const result = forecastRadarPlayback(frames, "13101", base, true);
      expect(result.map(frame => frame.validTime)).toEqual(frames.slice(Math.min(hits[0], 1), Math.min(hits[0], 1) + 5).map(frame => frame.validTime));
      expect(result.every(frame => frame.tile === tile && frame.basetime)).toBe(true);
      if (hits[0] === 0) expect(result[0].basetime).toBe(older);
    },
  );

  it("keeps an absent timestamp and an uncovered tile as unavailable slots", () => {
    const frames = fixtures(5, [0, 4]);
    frames[2].tileCoverage = [{ x: 13, y: 6 }];
    frames.splice(1, 1);
    const result = forecastRadarPlayback(frames, "13101", base, true);
    expect(result).toHaveLength(5);
    expect(result[1].validTime).toBe("20261124091000");
    expect(result.slice(1, 3).map(frame => frame.basetime)).toEqual([undefined, undefined]);
  });

  it("uses the snapshot base for available legacy frames", () => {
    const frames = fixtures(5, [0, 2]);
    expect(forecastRadarPlayback(frames, "13101", base).map(frame => frame.basetime)).toEqual(Array(5).fill(base));
  });
});
