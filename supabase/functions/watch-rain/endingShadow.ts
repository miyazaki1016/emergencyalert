/** Read-only comparison of 10/15/30 minute post-ending forecasts.
 * No result is an observation and none controls outgoing push notifications.
 */
export type EndingShadowFrame = { validTime?: string | null; status?: string | null };
export type EndingWindowState = "CLEAR_FORECAST" | "RE_RAIN_FORECAST" | "INSUFFICIENT_FORECAST";
export type EndingWindowResult = {
  status: EndingWindowState;
  reRainTime: string | null;
};
export type EndingShadowAssessment = {
  status: "NO_ENDING" | "NOT_CURRENTLY_RAINING" | "INSUFFICIENT_FORECAST" | "RE_RAIN_FORECAST" | "CLEAR_THROUGH_AVAILABLE_HORIZON";
  endingTime: string | null;
  futureFrameCount: number;
  dryFramesFromEnding: number;
  coverageMinutes: number;
  firstReRainTime: string | null;
  windows: Record<"10" | "15" | "30", EndingWindowResult>;
};

function frameTime(value: string | null | undefined): number | null {
  if (!value || !/^\d{14}$/.test(value)) return null;
  const year = Number(value.slice(0, 4)), month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8)), hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12)), second = Number(value.slice(12, 14));
  const time = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(time) || new Date(time).toISOString().replace(/[-:TZ.]/g, "").slice(0, 14) !== value) return null;
  return time;
}

const unknownWindow = (): EndingWindowResult => ({ status: "INSUFFICIENT_FORECAST", reRainTime: null });

export function assessEndingShadow(input: {
  currentStatus: string | null | undefined;
  endingTime: string | null | undefined;
  forecast: EndingShadowFrame[];
}): EndingShadowAssessment {
  const windows: EndingShadowAssessment["windows"] = { "10": unknownWindow(), "15": unknownWindow(), "30": unknownWindow() };
  const base = {
    endingTime: input.endingTime ?? null,
    futureFrameCount: 0, dryFramesFromEnding: 0, coverageMinutes: 0,
    firstReRainTime: null as string | null, windows,
  };
  if (!input.endingTime) return { ...base, status: "NO_ENDING" };
  if (input.currentStatus === "NO_RAIN") return { ...base, status: "NOT_CURRENTLY_RAINING" };
  // Missing/unclassified radar is uncertainty, NOT evidence that the place is dry.
  if (input.currentStatus !== "RAIN") return { ...base, status: "INSUFFICIENT_FORECAST" };
  const endingAt = frameTime(input.endingTime);
  if (endingAt === null) return { ...base, status: "INSUFFICIENT_FORECAST" };
  const after = input.forecast
    .map(frame => ({ ...frame, time: frameTime(frame.validTime) }))
    .filter((frame): frame is EndingShadowFrame & { time: number } => frame.time !== null && frame.time >= endingAt)
    .sort((a, b) => a.time - b.time);

  let dryFramesFromEnding = 0;
  let firstReRainTime: string | null = null;
  let previousTime: number | null = null;
  let contiguous: typeof after = [];
  for (const frame of after) {
    if (frame.time !== endingAt && previousTime === null) break;
    if (previousTime !== null && frame.time - previousTime !== 5 * 60_000) break;
    if (frame.status !== "RAIN" && frame.status !== "NO_RAIN") break;
    contiguous.push(frame);
    previousTime = frame.time;
    if (frame.status === "RAIN") {
      firstReRainTime = frame.validTime ?? null;
      break;
    }
    dryFramesFromEnding++;
  }

  for (const minutes of [10, 15, 30] as const) {
    // Exact frames at ending time, +5, +10, etc. are required; never
    // interpret missing forecast coverage as a clear forecast.
    const count = minutes / 5 + 1;
    const subset = contiguous.slice(0, count);
    const rain = subset.find(frame => frame.status === "RAIN");
    if (rain) windows[String(minutes) as "10" | "15" | "30"] =
      { status: "RE_RAIN_FORECAST", reRainTime: rain.validTime ?? null };
    else if (subset.length === count) windows[String(minutes) as "10" | "15" | "30"] =
      { status: "CLEAR_FORECAST", reRainTime: null };
  }
  const coverageMinutes = Math.max(0, dryFramesFromEnding - 1) * 5;
  const status = firstReRainTime ? "RE_RAIN_FORECAST" :
    windows["10"].status === "CLEAR_FORECAST" ? "CLEAR_THROUGH_AVAILABLE_HORIZON" : "INSUFFICIENT_FORECAST";
  return { ...base, status, futureFrameCount: after.length, dryFramesFromEnding, coverageMinutes, firstReRainTime, windows };
}
