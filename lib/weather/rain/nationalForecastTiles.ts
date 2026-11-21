import { forecastTime, type NationalForecastFrame, type NationalForecastSnapshot } from "./nationalForecastSnapshot";

export const NATIONAL_FORECAST_WIDE_TILES = [[13, 5], [14, 5], [13, 6], [14, 6], [13, 7], [14, 7]] as const;

export type TileMunicipality = NationalForecastFrame["municipalities"][number];
export type ForecastTilePayload = {
  pending: string[];
  tiles: Record<string, TileMunicipality[]>;
};

export type ForecastTileVersion = {
  valid_time: string;
  base_time: string;
  extended: boolean;
  x: number;
  y: number;
  payload: ForecastTilePayload | null;
};

function regionForecast(versions: ForecastTileVersion[]) {
  const newest = versions.filter(row => row.payload?.pending.length === 0)
    .sort((a, b) => b.base_time.localeCompare(a.base_time))[0];
  if (!newest) return { municipalities: [], basetime: undefined };
  const municipalities = Object.values(newest.payload!.tiles).flat()
    .map(area => ({ ...area, basetime: newest.base_time }));
  return { municipalities, basetime: newest.base_time };
}

export function buildNationalTileForecast(rows: ForecastTileVersion[], now = Date.now()): NationalForecastSnapshot | undefined {
  const times = new Map<string, Map<string, ForecastTileVersion[]>>();
  for (const row of rows) {
    if (forecastTime(row.valid_time) <= now || forecastTime(row.base_time) > now) continue;
    const timeKey = `${Number(row.extended)}/${row.valid_time}`;
    const regionKey = `${row.x}/${row.y}`;
    const regions = times.get(timeKey) ?? new Map<string, ForecastTileVersion[]>();
    const versions = regions.get(regionKey) ?? [];
    versions.push(row);
    regions.set(regionKey, versions);
    times.set(timeKey, regions);
  }
  const frames: NationalForecastFrame[] = [];
  const extendedFrames: NationalForecastFrame[] = [];
  let basetime = "";
  for (const [key, regions] of [...times].sort(([a], [b]) => a.localeCompare(b))) {
    const matches = new Map<string, TileMunicipality>();
    const basetimes = new Set<string>();
    let incomplete = false;
    let refreshPending = false;
    const tileCoverage: NonNullable<NationalForecastFrame["tileCoverage"]> = [];
    for (const [x, y] of NATIONAL_FORECAST_WIDE_TILES) {
      const versions = regions.get(`${x}/${y}`) ?? [];
      const region = regionForecast(versions);
      tileCoverage.push({ x, y, basetime: region.basetime });
      if (region.basetime) {
        basetimes.add(region.basetime);
        refreshPending ||= versions.some(version => version.base_time > region.basetime!);
      } else incomplete = true;
      for (const area of region.municipalities) {
        const previous = matches.get(area.code);
        if (!previous || previous.minimumMmPerHour < area.minimumMmPerHour
          || (previous.minimumMmPerHour === area.minimumMmPerHour && area.basetime! > previous.basetime!)) {
          matches.set(area.code, area);
        }
      }
    }
    for (const base of basetimes) if (base > basetime) basetime = base;
    const [band, validTime] = key.split("/");
    (band === "1" ? extendedFrames : frames).push({
      validTime, municipalities: [...matches.values()], incomplete, refreshPending,
      basetimes: [...basetimes].sort(), tileCoverage,
    });
  }
  if (!basetime) return undefined;
  return { source: "JMA", n03Version: "20260101", basetime, frames, extendedFrames, tileVersions: true };
}
