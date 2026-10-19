/**
 * Read-only evidence for evaluating ending alerts against the later forecast.
 * This function DOES NOT control delivery or claim observed ground truth.
 */
export type EndingShadowFrame = {
  validTime?: string | null;
  status?: string | null;
};

export type EndingShadowAssessment = {
  status: "NO_ENDING" | "NOT_CURRENTLY_RAINING" | "INSUFFICIENT_FORECAST" | "RE_RAIN_FORECAST" | "CLEAR_THROUGH_AVAILABLE_HORIZON";
  endingTime: string | null;
  futureFrameCount: number;
  dryFramesFromEnding: number;
  firstReRainTime: string | null;
};

function frameTime(value: string | null | undefined): number | null {
  if (!value || !/^\d{14}$/.test(value)) return null;
  const iso = value.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3T$4:$5:$6Z");
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : null;
}

export function assessEndingShadow(input: {
  currentStatus: string | null | undefined;
  endingTime: string | null | undefined;
  forecast: EndingShadowFrame[];
}): EndingShadowAssessment {
  const base = {
    endingTime: input.endingTime ?? null,
    futureFrameCount: 0,
    dryFramesFromEnding: 0,
    firstReRainTime: null as string | null,
  };
  if (!input.endingTime) return { ...base, status: "NO_ENDING" };
  if (input.currentStatus !== "RAIN") return { ...base, status: "NOT_CURRENTLY_RAINING" };
  const endingAt = frameTime(input.endingTime);
  if (endingAt === null) return { ...base, status: "INSUFFICIENT_FORECAST" };
  const after = input.forecast
    .map((frame) => ({ ...frame, time: frameTime(frame.validTime) }))
    .filter((frame) => frame.time !== null && frame.time >= endingAt)
    .sort((a, b) => a.time! - b.time!);
  const counts = { ...base, futureFrameCount: after.length };
  if (after.length < 3) return { ...counts, status: "INSUFFICIENT_FORECAST" };
  let dryFramesFromEnding = 0;
  let previousTime: number | null = null;
  for (const frame of after) {
    if (previousTime !== null && frame.time! - previousTime !== 5 * 60_000) {
      return { ...counts, status: "INSUFFICIENT_FORECAST", dryFramesFromEnding };
    }
    previousTime = frame.time!;
    if (frame.status === "RAIN") {
      return {
        ...counts, status: "RE_RAIN_FORECAST",
        dryFramesFromEnding, firstReRainTime: frame.validTime ?? null,
      };
    }
    if (frame.status !== "NO_RAIN") {
      return { ...counts, status: "INSUFFICIENT_FORECAST", dryFramesFromEnding };
    }
    dryFramesFromEnding++;
  }
  return {
    ...counts, status: "CLEAR_THROUGH_AVAILABLE_HORIZON",
    dryFramesFromEnding,
  };
}
