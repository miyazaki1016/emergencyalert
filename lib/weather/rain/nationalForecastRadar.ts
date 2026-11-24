import { buildJmaRainTileUrl } from "../providers/jma/tileUrl";
import { forecastTime, type NationalForecastFrame, type RadarTile } from "./nationalForecastSnapshot";

export function forecastRadarSources(basetime: string, validTime: string, tile: RadarTile) {
  return {
    background: `https://cyberjapandata.gsi.go.jp/xyz/pale/10/${tile.x}/${tile.y}.png`,
    rain: buildJmaRainTileUrl({ basetime, validtime: validTime }, 10, tile.x, tile.y),
  };
}

export type RadarPlaybackFrame = { validTime: string; basetime?: string; tile: RadarTile };

export function forecastRadarPlayback(
  frames: NationalForecastFrame[], code: string, snapshotBase: string, tileVersions?: true,
): RadarPlaybackFrame[] {
  const ordered = [...frames].sort((a, b) => forecastTime(a.validTime) - forecastTime(b.validTime));
  const first = ordered.find(frame => frame.municipalities.some(area => area.code === code));
  const anchor = first?.municipalities.find(area => area.code === code && area.radarTile)
    ?? ordered.flatMap(frame => frame.municipalities).find(area => area.code === code && area.radarTile);
  if (!first || !anchor?.radarTile) return [];
  const tile = anchor.radarTile;
  const step = 5 * 60_000;
  const end = forecastTime(ordered[ordered.length - 1].validTime);
  const start = Math.min(forecastTime(first.validTime), end - 4 * step);
  const byTime = new Map(ordered.map(frame => [forecastTime(frame.validTime), frame]));
  return Array.from({ length: 5 }, (_, index) => {
    const time = start + index * step;
    const frame = byTime.get(time);
    const validTime = frame?.validTime ?? new Date(time).toISOString().slice(0, 19).replace(/[-:T]/g, "");
    const coverage = frame?.tileCoverage?.find(entry =>
      entry.x === Math.floor(tile.x / 64) && entry.y === Math.floor(tile.y / 64));
    const basetime = frame && (tileVersions ? coverage?.basetime : snapshotBase);
    return { validTime, basetime, tile };
  });
}
