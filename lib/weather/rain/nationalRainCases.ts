import { forecastTime, NATIONAL_FORECAST_FRESHNESS_MS, type NationalForecastFrame } from "./nationalForecastSnapshot";
import { buildNationalTileForecast, NATIONAL_FORECAST_WIDE_TILES, type ForecastTileVersion } from "./nationalForecastTiles";

const STEP = 300_000;
export const caseStamp = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace(/[-:T]/g, "");

export function planNationalRainCaseVersion(rows: ForecastTileVersion[], now: number) {
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
      const complete = NATIONAL_FORECAST_WIDE_TILES.every(([x, y]) =>
        coverage.some(tile => tile.x === x && tile.y === y && tile.basetime === newest));
      result.push({
        validTime: new Date(epoch).toISOString(), band, complete,
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
