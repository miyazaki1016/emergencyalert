import { describe, expect, it } from "vitest";
import { buildNationalTileForecast, type ForecastTileVersion, type TileMunicipality } from "./nationalForecastTiles";

const now = Date.UTC(2026, 10, 21, 5, 10);
const oldBase = "20261121050000";
const newBase = "20261121050500";
const valid = "20261121052000";
const city = (code: string, minimumMmPerHour: TileMunicipality["minimumMmPerHour"] = 50): TileMunicipality =>
  ({ code, prefecture: "東京都", municipality: code, minimumMmPerHour });
function row(base_time: string, payload: ForecastTileVersion["payload"], options: Partial<ForecastTileVersion> = {}): ForecastTileVersion {
  return { valid_time: valid, base_time, payload, extended: false, x: 13, y: 6, ...options };
}

describe("national forecast tile versions", () => {
  it("keeps the entire previous wide tile while any required detail is missing", () => {
    const previous = row(oldBase, { pending: [], tiles: { "840/390": [city("13101")], "841/390": [city("13102")] } });
    const pending = row(newBase, { pending: ["841/390"], tiles: { "840/390": [] } });
    const latest = buildNationalTileForecast([pending, previous], now)!.frames[0];
    expect(latest.municipalities).toEqual([city("13101"), city("13102")].map(area => ({ ...area, basetime: oldBase })));
    expect(latest.basetimes).toEqual([oldBase]);
    const completed = row(newBase, { pending: [], tiles: { "840/390": [], "841/390": [city("13102", 30)] } });
    expect(buildNationalTileForecast([completed, previous], now)!.frames[0].municipalities)
      .toEqual([{ ...city("13102", 30), basetime: newBase }]);
  });

  it("keeps other wide tiles when a new wide tile is unavailable and does not regress on out-of-order arrival", () => {
    const previous = row(oldBase, { pending: [], tiles: { "840/390": [city("13101")] } });
    const next = row(newBase, null);
    const other = row(newBase, { pending: [], tiles: { "900/390": [city("13102")] } }, { x: 14 });
    expect(buildNationalTileForecast([next, other, previous], now)!.frames[0].municipalities)
      .toEqual([{ ...city("13101"), basetime: oldBase }, { ...city("13102"), basetime: newBase }]);
    const fixed = row(newBase, { pending: [], tiles: {} });
    expect(buildNationalTileForecast([fixed, previous], now)!.frames[0].municipalities).toEqual([]);
  });

  it("recomputes the maximum across tiles when a municipality crosses a tile boundary", () => {
    const previous = row(oldBase, { pending: [], tiles: { "840/390": [city("13101", 80)] } });
    const other = row(oldBase, { pending: [], tiles: { "900/390": [city("13101", 30)] } }, { x: 14 });
    const next = row(newBase, { pending: [], tiles: { "840/390": [] } });
    expect(buildNationalTileForecast([previous, next, other], now)!.frames[0].municipalities)
      .toEqual([{ ...city("13101", 30), basetime: oldBase }]);
  });

  it("distinguishes incomplete coverage, complete dry coverage and elapsed times", () => {
    const dry = [{x:13,y:5},{x:14,y:5},{x:13,y:6},{x:14,y:6},{x:13,y:7},{x:14,y:7}]
      .map(tile => row(newBase, { pending: [], tiles: {} }, tile));
    expect(buildNationalTileForecast(dry, now)!.frames[0]).toMatchObject({ incomplete: false, municipalities: [] });
    const failed = row(newBase, null, { valid_time: "20261121055000", extended: true });
    expect(buildNationalTileForecast([...dry.slice(1), failed], now)!.frames[0].incomplete).toBe(true);
    expect(buildNationalTileForecast([...dry, failed], now)!.extendedFrames?.[0]).toMatchObject({
      incomplete: true, basetimes: [],
    });
    expect(buildNationalTileForecast(dry, Date.UTC(2026, 10, 21, 5, 20))).toBeUndefined();
  });
});
