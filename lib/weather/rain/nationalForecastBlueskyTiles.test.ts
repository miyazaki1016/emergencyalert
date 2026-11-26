import { describe, expect, it } from "vitest";
import { planTileForecastPublication } from "./nationalForecastBlueskyTiles";
import { NATIONAL_FORECAST_WIDE_TILES, type ForecastTileVersion } from "./nationalForecastTiles";

const initial = Date.UTC(2026, 10, 24, 2);
const step = 300_000;
const iso = (time: number) => new Date(time).toISOString();

function rows(base: number, intensity?: 30 | 50 | 80): ForecastTileVersion[] {
  return Array.from({ length: 6 }, (_, slot) => NATIONAL_FORECAST_WIDE_TILES.map(([x, y]): ForecastTileVersion => ({
    x, y, extended: false, base_time: iso(base), valid_time: iso(base + (slot + 1) * step),
    payload: {
      pending: [],
      tiles: intensity && x === 13 && y === 7 ? { sample: [{
        code: "example", prefecture: "検証県", municipality: "検証市", minimumMmPerHour: intensity,
      }] } : {},
    },
  }))).flat();
}

describe("tile-based forecast publication dry run", () => {
  const wet = planTileForecastPublication(rows(initial, 30), null, initial)!;

  it("starts quietly and compares confirmed increases using the newest complete tile", () => {
    expect(wet.candidates).toEqual([]);
    const base = initial + step;
    const lateOld = { ...rows(base, 80).find(row => row.x === 13 && row.y === 7)!, base_time: iso(initial) };
    const plan = planTileForecastPublication([...rows(base, 50), lateOld], wet.nextSnapshot, base);
    expect(plan?.candidates).toMatchObject([{ municipalityCode: "example", intensity: 50, validTime: iso(base + step) }]);
  });

  it("rejects tile-level regression even when the overall base advances", () => {
    const base = initial + step;
    const mixed = rows(base, 80).map(row => row.x === 13 && row.y === 7 ? { ...row, base_time: iso(initial - step) } : row);
    expect(planTileForecastPublication(mixed, wet.nextSnapshot, base)).toBeNull();
  });

  it("keeps the prior wet baseline across an unavailable tile, then detects a real dry-to-wet return", () => {
    const base = initial + step;
    const missing = rows(base).filter(row => row.x !== 13 || row.y !== 7);
    expect(planTileForecastPublication(missing, wet.nextSnapshot, base)).toBeNull();
    expect(planTileForecastPublication(rows(base, 30), wet.nextSnapshot, base)?.candidates).toEqual([]);
    const dry = planTileForecastPublication(rows(base), wet.nextSnapshot, base)!;
    expect(planTileForecastPublication(rows(base + step, 30), dry.nextSnapshot, base + step)?.candidates).toHaveLength(1);
  });

  it("filters extended rows and rejects stale input and an entirely missing slot", () => {
    const base = initial + step;
    const extended = rows(base, 80).map(row => ({ ...row, extended: true }));
    expect(planTileForecastPublication([...rows(base), ...extended], wet.nextSnapshot, base)?.candidates).toEqual([]);
    expect(planTileForecastPublication(rows(base), null, base + 16 * 60_000)).toBeNull();
    expect(planTileForecastPublication(rows(base).filter(row => row.valid_time !== iso(base + 2 * step)), null, base)).toBeNull();
  });
});
