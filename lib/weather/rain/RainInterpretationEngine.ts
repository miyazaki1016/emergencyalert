import type { OfficialRainFrame, RainIntensityClass } from "../types";

export type RainInterpretationState =
  | "INSUFFICIENT_DATA"
  | "DRY"
  | "RAIN_AHEAD"
  | "ACTIONABLE_RAIN"
  | "RAINING"
  | "EASING"
  | "ENDING";

export interface RainInterpretation {
  state: RainInterpretationState;
  shouldNotify: boolean;
  firstRainTime: string | null;
  firstActionableRainTime: string | null;
  endingTime: string | null;
}

export interface RainSeriesInput {
  now: Date;
  current: OfficialRainFrame | null;
  forecast: OfficialRainFrame[];
  expectedForecastFrames?: number;
}

const ACTIONABLE = new Set<RainIntensityClass>([
  "5_TO_10", "10_TO_20", "20_TO_30", "30_TO_50", "50_TO_80", "GTE_80",
]);

const INVALID = new Set([
  "NO_DATA", "OUT_OF_COVERAGE", "FETCH_ERROR", "UNKNOWN_PIXEL",
]);

export function interpretRainSeries(input: RainSeriesInput): RainInterpretation {
  const { now, current, expectedForecastFrames } = input;

  if (!current || INVALID.has(current.status)) return empty("INSUFFICIENT_DATA");
  if (!isValidJmaTime(current.validTime) || input.forecast.some((f) => !isValidJmaTime(f.validTime))) {
    return empty("INSUFFICIENT_DATA");
  }
  // JMA nowcast updates every 5 minutes. Keep a small operational tolerance,
  // but never publish a fresh-looking claim from an old observation.
  const observationAgeMinutes = (now.getTime() - parseJmaTime(current.validTime).getTime()) / 60_000;
  if (observationAgeMinutes < -5 || observationAgeMinutes > 15) {
    return empty("INSUFFICIENT_DATA");
  }

  const forecast = [...input.forecast].sort(
    (a, b) => parseJmaTime(a.validTime).getTime() - parseJmaTime(b.validTime).getTime(),
  );

  // Forecast metadata should describe now/future frames. If every target is
  // already in the past, fail closed instead of presenting a fresh-looking claim.
  if (forecast.length > 0 && forecast.every((f) => minutesFrom(now, f.validTime) < 0)) {
    return empty("INSUFFICIENT_DATA");
  }

  const future = forecast.filter((f) => minutesFrom(now, f.validTime) >= 0);
  const validFuture = future.filter((f) => !INVALID.has(f.status));
  const firstRain = validFuture.find((f) => f.status === "RAIN");
  const firstActionable = validFuture.find(
    (f) => f.status === "RAIN" && f.intensityClass !== null && ACTIONABLE.has(f.intensityClass),
  );

  if (current.status === "RAIN") {
    const ending = findEndingTime(future);
    const easing = !ending && isEasing(current, future);
    return {
      state: ending ? "ENDING" : easing ? "EASING" : "RAINING",
      shouldNotify: false,
      firstRainTime: current.validTime,
      firstActionableRainTime: firstActionable?.validTime ?? null,
      endingTime: ending,
    };
  }

  if (firstActionable) {
    const mins = minutesFrom(now, firstActionable.validTime);
    return {
      state: mins <= 30 ? "ACTIONABLE_RAIN" : "RAIN_AHEAD",
      shouldNotify: mins <= 30,
      firstRainTime: firstRain?.validTime ?? null,
      firstActionableRainTime: firstActionable.validTime,
      endingTime: null,
    };
  }

  if (firstRain) {
    return {
      state: "RAIN_AHEAD",
      shouldNotify: false,
      firstRainTime: firstRain.validTime,
      firstActionableRainTime: null,
      endingTime: null,
    };
  }

  const complete =
    expectedForecastFrames !== undefined &&
    expectedForecastFrames > 0 &&
    future.length === expectedForecastFrames &&
    future.every((f) => !INVALID.has(f.status));

  if (complete && future.every((f) => f.status === "NO_RAIN")) return empty("DRY");
  return empty("INSUFFICIENT_DATA");
}

function isEasing(current: OfficialRainFrame, frames: OfficialRainFrame[]): boolean {
  if (current.status !== "RAIN" || current.intensityClass === null) return false;
  const rank: Record<RainIntensityClass, number> = {
    LT_1: 0, "1_TO_5": 1, "5_TO_10": 2, "10_TO_20": 3,
    "20_TO_30": 4, "30_TO_50": 5, "50_TO_80": 6, GTE_80: 7,
  };
  // Trend claims must use the next three chronological frames. Never skip an
  // unknown/missing frame and stitch later values together into a false trend.
  const comparable = frames.slice(0, 3);
  if (comparable.length < 3) return false;
  if (
    comparable.some(
      (f) => INVALID.has(f.status) || f.status !== "RAIN" || f.intensityClass === null,
    )
  ) return false;
  return comparable.every((f) => rank[f.intensityClass!] < rank[current.intensityClass!]);
}

function findEndingTime(frames: OfficialRainFrame[]): string | null {
  for (let i = 0; i <= frames.length - 3; i++) {
    const run = frames.slice(i, i + 3);
    if (run.some((f) => INVALID.has(f.status))) continue;
    if (run.every((f) => f.status === "NO_RAIN")) return run[0].validTime;
  }
  return null;
}

function minutesFrom(now: Date, jmaTime: string): number {
  return (parseJmaTime(jmaTime).getTime() - now.getTime()) / 60_000;
}

function isValidJmaTime(value: string): boolean {
  try {
    const parsed = parseJmaTime(value);
    return parsed.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14) === value;
  } catch {
    return false;
  }
}

function parseJmaTime(value: string): Date {
  if (!/^\d{14}$/.test(value)) throw new Error("Invalid JMA timestamp.");
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(4, 6));
  const d = Number(value.slice(6, 8));
  const hh = Number(value.slice(8, 10));
  const mm = Number(value.slice(10, 12));
  const ss = Number(value.slice(12, 14));
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
}

function empty(state: RainInterpretationState): RainInterpretation {
  return { state, shouldNotify: false, firstRainTime: null, firstActionableRainTime: null, endingTime: null };
}
