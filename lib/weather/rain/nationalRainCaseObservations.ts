import { classifyRainPixel } from "../providers/jma/classifyPixel";
import { PNG } from "pngjs";
import { maskHasPixel, TILE_PIXELS } from "./lightRainPixelMasks";
import { caseStamp } from "./nationalRainCases";
import { forecastTime } from "./nationalForecastSnapshot";

export type ObservedTier = 0 | 30 | 50 | 80;
export type ObservationMask = { x: number; y: number; mask: Uint8Array };

export const CASE_OBSERVATION_METHOD =
  "気象庁の高解像度降水ナウキャスト（5分刻みのレーダー実況）。予報有効時刻と同時刻の実況を、自治体領域の最大降水強度階級（30・50・80 mm/h以上）で比較。取得できない時刻・領域は不明。";

export function observedTileTier(buffer: Buffer, mask: Uint8Array): ObservedTier | null {
  const png = PNG.sync.read(buffer);
  if (png.width !== TILE_PIXELS || png.height !== TILE_PIXELS) throw new Error("Unexpected JMA observation tile dimensions");
  let peak: ObservedTier = 0;
  for (let pixel = 0; pixel < TILE_PIXELS ** 2; pixel++) {
    if (!maskHasPixel(mask, pixel)) continue;
    const offset = pixel * 4;
    const { status, intensityClass } = classifyRainPixel({
      r: png.data[offset], g: png.data[offset + 1], b: png.data[offset + 2], a: png.data[offset + 3],
    });
    if (status === "UNKNOWN_PIXEL") return null;
    if (intensityClass === "GTE_80") peak = 80;
    else if (intensityClass === "50_TO_80" && peak < 50) peak = 50;
    else if (intensityClass === "30_TO_50" && peak < 30) peak = 30;
  }
  return peak;
}

export async function collectCaseObservations({
  validTimes, published, masks, readTile, signal,
}: {
  validTimes: Iterable<string>;
  published: ReadonlySet<string>;
  masks: ObservationMask[];
  readTile: (stamp: string, x: number, y: number) => Promise<Buffer | null>;
  signal: AbortSignal;
}) {
  const observations: Record<string, ObservedTier | null> = {};
  const jobs: { stamp: string; times: string[]; tile: ObservationMask }[] = [];
  const byStamp = new Map<string, string[]>();
  for (const time of new Set(validTimes)) {
    const epoch = forecastTime(time);
    if (!Number.isFinite(epoch)) throw new Error("Invalid stored forecast valid time");
    const stamp = caseStamp(epoch);
    if (!masks.length || !published.has(stamp)) {
      observations[time] = null;
      continue;
    }
    const times = byStamp.get(stamp) ?? [];
    times.push(time);
    byStamp.set(stamp, times);
    observations[time] = 0;
  }
  for (const [stamp, times] of byStamp) {
    for (const tile of masks) jobs.push({ stamp, times, tile });
  }
  const parallelism = 8;
  for (let i = 0; i < jobs.length; i += parallelism) {
    signal.throwIfAborted();
    await Promise.all(jobs.slice(i, i + parallelism).map(async ({ stamp, times, tile }) => {
      const image = await readTile(stamp, tile.x, tile.y);
      const tier = image === null ? null : observedTileTier(image, tile.mask);
      for (const time of times) {
        const previous = observations[time];
        observations[time] = tier === null || previous === null ? null : tier > previous ? tier : previous;
      }
    }));
  }
  return observations;
}
