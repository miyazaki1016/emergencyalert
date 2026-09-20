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

const ACTIONABLE = new Set<RainIntensityClass>([
  "5_TO_10",
  "10_TO_20",
  "20_TO_30",
  "30_TO_50",
  "50_TO_80",
  "GTE_80",
]);

const INVALID = new Set([
  "NO_DATA",
  "OUT_OF_COVERAGE",
  "FETCH_ERROR",
  "UNKNOWN_PIXEL",
]);

export function interpretRainSeries(
  frames: OfficialRainFrame[],
  now: Date,
): RainInterpretation {
  const ordered = [...frames].sort(
    (a, b) => parseJmaTime(a.validTime).getTime() - parseJmaTime(b.validTime).getTime(),
  );
  const valid = ordered.filter((f) => !INVALID.has(f.status));
  if (valid.length === 0) return empty("INSUFFICIENT_DATA");

  const current = valid.find((f) => minutesFrom(now, f.validTime) <= 5) ?? valid[0];
  const currentlyRaining = current.status === "RAIN";

  const firstRain = valid.find(
    (f) => minutesFrom(now, f.validTime) >= 0 && f.status === "RAIN",
  );
  const firstActionable = valid.find(
    (f) =>
      minutesFrom(now, f.validTime) >= 0 &&
      f.status === "RAIN" &&
      f.intensityClass !== null &&
      ACTIONABLE.has(f.intensityClass),
  );

  if (currentlyRaining) {
    const ending = findEndingTime(ordered);
    if (ending) {
      return {
        state: "ENDING",
        shouldNotify: false,
        firstRainTime: current.validTime,
        firstActionableRainTime: firstActionable?.validTime ?? null,
        endingTime: ending,
      };
    }
    return {
      state: "RAINING",
      shouldNotify: false,
      firstRainTime: current.validTime,
      firstActionableRainTime: firstActionable?.validTime ?? null,
      endingTime: null,
    };
  }

  if (firstActionable) {
    const mins = minutesFrom(now, firstActionable.validTime);
    return {
      state: mins <= 30 ? "ACTIONABLE_RAIN" : "RAIN_AHEAD",
      shouldNotify: mins >= 0 && mins <= 30,
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

  const future = valid.filter((f) => minutesFrom(now, f.validTime) >= 0);
  if (future.length > 0 && future.every((f) => f.status === "NO_RAIN")) {
    return empty("DRY");
  }
  return empty("INSUFFICIENT_DATA");
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
  return {
    state,
    shouldNotify: false,
    firstRainTime: null,
    firstActionableRainTime: null,
    endingTime: null,
  };
}
