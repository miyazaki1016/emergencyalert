import { significantForecastChanges, type ForecastPublishPlan } from "./nationalForecastBluesky";
import {
  forecastTime, NATIONAL_FORECAST_FRESHNESS_MS, type NationalForecastSnapshot,
} from "./nationalForecastSnapshot";
import { buildNationalTileForecast, type ForecastTileVersion } from "./nationalForecastTiles";

const STEP_MS = 5 * 60_000;

function coverage(snapshot: NationalForecastSnapshot) {
  const byTime = new Map<string, number>();
  const byTile = new Map<string, number>();
  for (const frame of snapshot.frames) {
    for (const tile of frame.tileCoverage ?? []) {
      if (!tile.basetime) continue;
      const key = `${tile.x}/${tile.y}`;
      const base = forecastTime(tile.basetime);
      byTime.set(`${forecastTime(frame.validTime)}/${key}`, base);
      byTile.set(key, Math.max(base, byTile.get(key) ?? -Infinity));
    }
  }
  return { byTime, byTile };
}

export function planTileForecastPublication(
  rows: ForecastTileVersion[],
  previous: NationalForecastSnapshot | null,
  now = Date.now(),
): ForecastPublishPlan | null {
  const snapshot = buildNationalTileForecast(rows.filter(row => !row.extended), now);
  if (!snapshot) return null;
  const base = forecastTime(snapshot.basetime);
  if (!Number.isFinite(base) || now - base > NATIONAL_FORECAST_FRESHNESS_MS) return null;

  // Missing areas or times cannot establish a dry baseline. Keep the last
  // complete observation until the entire detailed window is usable again.
  const times = new Set(snapshot.frames.map(frame => forecastTime(frame.validTime)));
  for (let slot = 1; slot <= 6; slot++) {
    const valid = base + slot * STEP_MS;
    if (valid > now && !times.has(valid)) return null;
  }
  if (!times.size || snapshot.frames.some(frame => frame.incomplete)) return null;

  const current = coverage(snapshot);
  if (previous) {
    if (previous.tileVersions !== true) return null;
    const old = coverage(previous);
    for (const [key, version] of current.byTime) {
      if (version < (old.byTime.get(key) ?? -Infinity)) return null;
    }
    let advanced = false;
    for (const [key, version] of old.byTile) {
      const latest = current.byTile.get(key) ?? -Infinity;
      if (latest < version) return null;
      if (latest > version) advanced = true;
    }
    if (!advanced && ![...current.byTime].some(([key, version]) =>
      old.byTime.has(key) && version > old.byTime.get(key)!)) return null;
  }

  return { candidates: significantForecastChanges(snapshot, previous), nextSnapshot: snapshot };
}
