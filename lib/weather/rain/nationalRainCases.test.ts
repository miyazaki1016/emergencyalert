import { describe, expect, it } from "vitest";
import { caseStamp, municipalityCaseTiles, planNationalRainCaseVersion } from "./nationalRainCases";
import type { AdministrativeArea } from "./lightRainAdministrativeAreas";
import { NATIONAL_FORECAST_WIDE_TILES, type ForecastTileVersion } from "./nationalForecastTiles";

const base = Date.parse("2026-11-25T12:05:00Z");
const now = base + 6 * 60_000;
const hit = { code: "17384", prefecture: "石川県", municipality: "志賀町", minimumMmPerHour: 30 as const };
const localTiles = new Map([
  ["01202", ["14/5"]], ["16205", ["14/6"]], ["00001", ["13/5", "14/5"]], ["00002", []],
]);

function version(lead: number, age = 0): ForecastTileVersion[] {
  return NATIONAL_FORECAST_WIDE_TILES.map(([x, y]) => ({
    base_time: caseStamp(base - age * 60_000), valid_time: caseStamp(base + lead * 60_000),
    extended: lead > 30, x, y, payload: { pending: [], tiles: {} },
  }));
}

describe("national rain case input", () => {
  it("uses the public complete tile and marks missing or stale coverage unknown", () => {
    const latest = version(10);
    latest[0].payload = { pending: ["900/400"], tiles: { "900/400": [hit] } };
    const older = version(10, 5);
    older[0].payload = { pending: [], tiles: { "900/400": [{ ...hit, minimumMmPerHour: 50 }] } };
    const complete = version(20);
    complete[0].payload = { pending: [], tiles: { "900/400": [hit] } };

    const planned = planNationalRainCaseVersion([...older, ...latest, ...complete, ...version(35)], now, localTiles)!;
    expect(planned.p_base).toBe(new Date(base).toISOString());
    expect(planned.p_batch.find(slot => slot.validTime === "2026-11-25T12:15:00.000Z"))
      .toMatchObject({ complete: false, municipalities: [{ ...hit, minimumMmPerHour: 50, basetime: caseStamp(base - 300_000) }] });
    expect(planned.p_batch.find(slot => slot.validTime === "2026-11-25T12:20:00.000Z"))
      .toMatchObject({ complete: false, municipalities: [] });
    expect(planned.p_batch.find(slot => slot.validTime === "2026-11-25T12:25:00.000Z"))
      .toMatchObject({ complete: true, municipalities: [hit] });
    expect(planned.p_batch.find(slot => slot.validTime === "2026-11-25T12:40:00.000Z"))
      .toMatchObject({ complete: true, band: "extended" });
  });

  it("does not advance on extended-only input or an old completed detail version", () => {
    expect(planNationalRainCaseVersion(version(35), now, localTiles)).toBeUndefined();
    expect(planNationalRainCaseVersion(version(25, 10), now, localTiles)).toBeUndefined();
  });

  it("requires current coverage in each tile intersecting the municipality", () => {
    const current = version(10);
    current[0].payload = null;
    const older = version(10, 5)[0];
    const extended = version(35).filter(tile => tile.x === 14 && tile.y === 6);
    const batch = planNationalRainCaseVersion([...current, older, ...extended], now, localTiles)!.p_batch;
    expect(batch[0]).toMatchObject({ complete: false, completeMunicipalities: ["01202", "16205"] });
    expect(batch.find(slot => slot.band === "extended")).toMatchObject({
      complete: false, completeMunicipalities: ["16205"],
    });
    expect(batch[1].completeMunicipalities).toEqual([]);
  });

  it("uses municipal geometry across wide-tile boundaries", () => {
    const area: AdministrativeArea = {
      code: "00001", prefecture: "fixture", municipality: "fixture",
      geometry: { type: "Polygon", coordinates: [[[134, 41], [136, 41], [136, 42], [134, 42], [134, 41]]] },
    };
    expect(municipalityCaseTiles([area]).get(area.code)).toEqual(["13/5", "14/5"]);
  });
});
