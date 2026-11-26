import { forecastTime, type NationalForecastFrame, type NationalForecastSnapshot } from "./nationalForecastSnapshot";

export type ForecastMapBand = "all" | "detail" | "extended";
type Municipality = NationalForecastFrame["municipalities"][number];
const FIVE_MINUTES = 5 * 60_000;

export function forecastMapSelection(
  forecast: NationalForecastSnapshot | null | undefined,
  band: ForecastMapBand,
  time: number | null,
) {
  const detail = forecast?.frames ?? [];
  const extended = forecast?.extendedFrames ?? [];
  const bandFrames = band === "detail" ? detail : band === "extended" ? extended : [...detail, ...extended];
  const framesByTime = new Map<number, NationalForecastFrame[]>();
  for (const frame of bandFrames) {
    const timestamp = forecastTime(frame.validTime);
    const simultaneous = framesByTime.get(timestamp) ?? [];
    simultaneous.push(frame);
    framesByTime.set(timestamp, simultaneous);
  }

  const times = [...framesByTime.keys()].sort((a, b) => a - b);
  const slots: { time: number; missing: boolean }[] = [];
  for (const [index, timestamp] of times.entries()) {
    const previous = times[index - 1];
    if (forecast?.tileVersions && previous !== undefined) {
      for (let gap = previous + FIVE_MINUTES; gap < timestamp; gap += FIVE_MINUTES) {
        slots.push({ time: gap, missing: true });
      }
    }
    slots.push({ time: timestamp, missing: false });
  }
  const activeTime = slots.some(slot => slot.time === time) ? time : null;
  const visible = activeTime === null ? bandFrames : framesByTime.get(activeTime) ?? [];
  const peaks = new Map<string, { area: Municipality; time: string }>();
  const tiles = new Map<string, NonNullable<NationalForecastFrame["tileCoverage"]>[number]>();
  for (const item of visible) {
    for (const area of item.municipalities) {
      const previous = peaks.get(area.code);
      if (!previous || previous.area.minimumMmPerHour < area.minimumMmPerHour) {
        peaks.set(area.code, { area, time: item.validTime });
      }
    }
    if (!forecast?.tileVersions) continue;
    for (const tile of item.tileCoverage ?? []) {
      const key = `${tile.x}/${tile.y}`;
      const previous = tiles.get(key);
      if (!previous || (tile.basetime && (!previous.basetime || forecastTime(tile.basetime) > forecastTime(previous.basetime)))) {
        tiles.set(key, tile);
      }
    }
  }

  const frame = visible.length ? {
    ...visible[0],
    municipalities: [...peaks.values()].map(peak => peak.area),
    incomplete: (activeTime === null && slots.some(slot => slot.missing)) || visible.some(item =>
      item.incomplete || (forecast?.tileVersions && item.tileCoverage?.some(tile => !tile.basetime))),
    tileCoverage: forecast?.tileVersions && tiles.size ? [...tiles.values()] : undefined,
  } : undefined;
  const hasCoverage = visible.some(item =>
    !forecast?.tileVersions || !item.tileCoverage || item.tileCoverage.some(tile => tile.basetime));
  return { bandFrames, slots, activeTime, peaks, frame, hasCoverage };
}
