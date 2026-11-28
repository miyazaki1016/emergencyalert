import { affectedAdministrativeAreas, type AdministrativeArea } from "./lightRainAdministrativeAreas";
import { forecastTime, NATIONAL_FORECAST_FRESHNESS_MS, type NationalForecastFrame } from "./nationalForecastSnapshot";
import { buildNationalTileForecast, NATIONAL_FORECAST_WIDE_TILES, type ForecastTileVersion } from "./nationalForecastTiles";

const STEP = 300_000;
export const caseStamp = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace(/[-:T]/g, "");

const wideLongitude = (x: number) => x / 16 * 360 - 180;
const wideLatitude = (y: number) => Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / 16)) * 180 / Math.PI;

export function municipalityCaseTiles(areas: AdministrativeArea[]) {
  const tilesByCode = new Map<string, string[]>();
  for (const [x, y] of NATIONAL_FORECAST_WIDE_TILES) {
    const west = wideLongitude(x), east = wideLongitude(x + 1);
    const north = wideLatitude(y), south = wideLatitude(y + 1);
    const footprint = { coordinates: [[[west, north], [east, north], [east, south], [west, south], [west, north]]] };
    for (const { code } of affectedAdministrativeAreas([footprint], areas)) {
      const tiles = tilesByCode.get(code) ?? [];
      tiles.push(`${x}/${y}`);
      tilesByCode.set(code, tiles);
    }
  }
  return tilesByCode;
}

export function planNationalRainCaseVersion(
  rows: ForecastTileVersion[], now: number, tilesByCode: ReadonlyMap<string, readonly string[]>,
) {
  const forecast = buildNationalTileForecast(rows, now);
  if (!forecast) return;
  // An extended-only advance cannot move the detailed episode cursor.
  const newest = forecast.frames.flatMap(frame => frame.basetimes ?? []).sort().at(-1);
  if (!newest) return;
  const base = forecastTime(newest);
  if (now - base > NATIONAL_FORECAST_FRESHNESS_MS) return;

  const slots = (frames: NationalForecastFrame[], first: number, last: number, band: "detail" | "extended") => {
    const byTime = new Map(frames.map(frame => [forecastTime(frame.validTime), frame]));
    const result = [];
    for (let lead = first; lead <= last; lead += STEP) {
      const epoch = base + lead;
      if (epoch <= now) continue;
      const frame = byTime.get(epoch);
      const coverage = frame?.tileCoverage ?? [];
      // The public snapshot may display older complete tiles while waiting
      // for a new version. Their data is retained but absence is not dry.
      const currentTiles = new Set(coverage.filter(tile => tile.basetime === newest).map(tile => `${tile.x}/${tile.y}`));
      const completeMunicipalities: string[] = [];
      for (const [code, tiles] of tilesByCode) {
        if (tiles.length && tiles.every(tile => currentTiles.has(tile))) completeMunicipalities.push(code);
      }
      result.push({
        validTime: new Date(epoch).toISOString(), band,
        // Older deployments can still read the nationwide completeness field.
        complete: currentTiles.size === NATIONAL_FORECAST_WIDE_TILES.length,
        completeMunicipalities,
        tileCoverage: coverage,
        municipalities: frame?.municipalities ?? [],
      });
    }
    return result;
  };

  const detail = slots(forecast.frames, STEP, 6 * STEP, "detail");
  if (!detail.length) return;
  return {
    p_base: new Date(base).toISOString(),
    p_batch: [...detail, ...slots(forecast.extendedFrames ?? [], 7 * STEP, 12 * STEP, "extended")],
  };
}
