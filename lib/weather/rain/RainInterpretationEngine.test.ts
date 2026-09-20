import { describe, expect, it } from "vitest";
import { interpretRainSeries } from "./RainInterpretationEngine";
import type { OfficialRainFrame, RainIntensityClass } from "../types";

const now = new Date("2026-09-20T11:00:00Z");
const ts = (mins: number) => {
  const d = new Date(now.getTime() + mins * 60_000);
  return d.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
};
const frame = (
  mins: number,
  status: OfficialRainFrame["status"],
  intensityClass: RainIntensityClass | null = null,
): OfficialRainFrame => ({
  baseTime: ts(0), validTime: ts(mins), status, intensityClass, rgba: null,
  source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
});

describe("RainInterpretationEngine", () => {
  it("notifies for actionable official rain within 30 minutes", () => {
    const result = interpretRainSeries({
      now, current: frame(0, "NO_RAIN"),
      forecast: [frame(5, "NO_RAIN"), frame(20, "RAIN", "5_TO_10")],
    });
    expect(result.state).toBe("ACTIONABLE_RAIN");
    expect(result.shouldNotify).toBe(true);
  });

  it("does not call an empty forecast DRY", () => {
    const result = interpretRainSeries({
      now,
      current: frame(0, "NO_RAIN"),
      forecast: [],
      expectedForecastFrames: 0,
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });

  it("withholds DRY when expected coverage is not independently known", () => {
    const result = interpretRainSeries({
      now, current: frame(0, "NO_RAIN"),
      forecast: [frame(5, "NO_RAIN"), frame(10, "NO_RAIN"), frame(15, "NO_RAIN")],
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });

  it("does not call a gapped forecast DRY", () => {
    const result = interpretRainSeries({
      now, current: frame(0, "NO_RAIN"),
      forecast: [frame(5, "NO_RAIN"), frame(10, "UNKNOWN_PIXEL"), frame(15, "NO_RAIN")],
      expectedForecastFrames: 3,
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });

  it("calls DRY only with complete valid expected coverage", () => {
    const result = interpretRainSeries({
      now, current: frame(0, "NO_RAIN"),
      forecast: [frame(5, "NO_RAIN"), frame(10, "NO_RAIN"), frame(15, "NO_RAIN")],
      expectedForecastFrames: 3,
    });
    expect(result.state).toBe("DRY");
  });

  it("does not infer ending across an unknown gap", () => {
    const result = interpretRainSeries({
      now, current: frame(0, "RAIN", "5_TO_10"),
      forecast: [
        frame(5, "NO_RAIN"), frame(10, "UNKNOWN_PIXEL"),
        frame(15, "NO_RAIN"), frame(20, "NO_RAIN"),
      ],
    });
    expect(result.state).toBe("RAINING");
    expect(result.endingTime).toBeNull();
  });

  it("calls sustained weaker official rain EASING without claiming it will end", () => {
    const result = interpretRainSeries({
      now, current: frame(0, "RAIN", "20_TO_30"),
      forecast: [
        frame(5, "RAIN", "10_TO_20"),
        frame(10, "RAIN", "5_TO_10"),
        frame(15, "RAIN", "5_TO_10"),
      ],
    });
    expect(result.state).toBe("EASING");
    expect(result.endingTime).toBeNull();
  });


  it("does not infer EASING by skipping an unknown near-term frame", () => {
    const result = interpretRainSeries({
      now, current: frame(0, "RAIN", "20_TO_30"),
      forecast: [
        frame(5, "UNKNOWN_PIXEL"),
        frame(10, "RAIN", "10_TO_20"),
        frame(15, "RAIN", "5_TO_10"),
        frame(20, "RAIN", "5_TO_10"),
      ],
    });
    expect(result.state).toBe("RAINING");
  });

  it("does not call a one-frame dip EASING", () => {
    const result = interpretRainSeries({
      now, current: frame(0, "RAIN", "20_TO_30"),
      forecast: [
        frame(5, "RAIN", "10_TO_20"),
        frame(10, "RAIN", "20_TO_30"),
        frame(15, "RAIN", "10_TO_20"),
      ],
    });
    expect(result.state).toBe("RAINING");
  });

  it("requires three consecutive valid no-rain frames for ENDING", () => {
    const result = interpretRainSeries({
      now, current: frame(0, "RAIN", "5_TO_10"),
      forecast: [frame(5, "NO_RAIN"), frame(10, "NO_RAIN"), frame(15, "NO_RAIN")],
    });
    expect(result.state).toBe("ENDING");
    expect(result.endingTime).toBe(ts(5));
  });

  it("fails closed when forecast base time is after its valid time", () => {
    const impossible = { ...frame(5, "NO_RAIN"), baseTime: ts(10) };
    const result = interpretRainSeries({
      now,
      current: frame(0, "NO_RAIN"),
      forecast: [impossible],
      expectedForecastFrames: 1,
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });

  it("fails closed when a JMA base time is malformed", () => {
    const malformedCurrent = { ...frame(0, "NO_RAIN"), baseTime: "not-a-jma-time" };
    const result = interpretRainSeries({
      now,
      current: malformedCurrent,
      forecast: [frame(5, "NO_RAIN")],
      expectedForecastFrames: 1,
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });

  it("fails closed when a JMA timestamp is malformed", () => {
    const malformedCurrent = { ...frame(0, "NO_RAIN"), validTime: "20261301120000" };
    const result = interpretRainSeries({
      now,
      current: malformedCurrent,
      forecast: [frame(5, "NO_RAIN")],
      expectedForecastFrames: 1,
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });

  it("fails closed when a forecast timestamp is malformed", () => {
    const malformedForecast = { ...frame(5, "NO_RAIN"), validTime: "not-a-jma-time" };
    const result = interpretRainSeries({
      now,
      current: frame(0, "NO_RAIN"),
      forecast: [malformedForecast],
      expectedForecastFrames: 1,
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });

  it("withholds claims when the entire forecast series is already stale", () => {
    const result = interpretRainSeries({
      now,
      current: frame(0, "NO_RAIN"),
      forecast: [frame(-15, "NO_RAIN"), frame(-10, "NO_RAIN"), frame(-5, "NO_RAIN")],
      expectedForecastFrames: 3,
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });

  it("withholds claims when the latest observation is stale", () => {
    const result = interpretRainSeries({
      now,
      current: frame(-20, "NO_RAIN"),
      forecast: [frame(5, "NO_RAIN")],
      expectedForecastFrames: 1,
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });

  it("withholds claims when an observation is implausibly in the future", () => {
    const result = interpretRainSeries({
      now,
      current: frame(10, "NO_RAIN"),
      forecast: [frame(15, "NO_RAIN")],
      expectedForecastFrames: 1,
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });

  it("accepts a recent observation within the freshness tolerance", () => {
    const result = interpretRainSeries({
      now,
      current: frame(-10, "NO_RAIN"),
      forecast: [frame(5, "NO_RAIN")],
      expectedForecastFrames: 1,
    });
    expect(result.state).toBe("DRY");
  });

  it("requires a valid current observation", () => {
    const result = interpretRainSeries({
      now, current: frame(0, "FETCH_ERROR"), forecast: [frame(5, "NO_RAIN")],
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });
});
