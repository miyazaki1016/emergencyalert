import { describe, expect, it } from "vitest";
import type { OfficialRainFrame, RainFrameStatus, RainIntensityClass } from "../types";
import { interpretRainSeries } from "./RainInterpretationEngine";

const now = new Date("2026-09-20T09:20:00Z");
const t = (minute: number) => `2026092009${String(minute).padStart(2, "0")}00`;

function frame(
  minute: number,
  status: RainFrameStatus,
  intensityClass: RainIntensityClass | null = null,
): OfficialRainFrame {
  return {
    baseTime: t(20),
    validTime: t(minute),
    status,
    intensityClass,
    rgba: null,
    source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
  };
}

describe("RainInterpretationEngine", () => {
  it("does not notify for drizzle only", () => {
    const result = interpretRainSeries([
      frame(25, "NO_RAIN"),
      frame(30, "RAIN", "1_TO_5"),
      frame(35, "RAIN", "1_TO_5"),
    ], now);
    expect(result.state).toBe("RAIN_AHEAD");
    expect(result.shouldNotify).toBe(false);
  });

  it("notifies when >=5 mm/h class is within 30 minutes", () => {
    const result = interpretRainSeries([
      frame(25, "NO_RAIN"),
      frame(30, "RAIN", "1_TO_5"),
      frame(40, "RAIN", "5_TO_10"),
    ], now);
    expect(result.state).toBe("ACTIONABLE_RAIN");
    expect(result.shouldNotify).toBe(true);
    expect(result.firstActionableRainTime).toBe(t(40));
  });

  it("watches but does not notify when actionable rain is more than 30 minutes away", () => {
    const result = interpretRainSeries([
      frame(25, "NO_RAIN"),
      frame(55, "RAIN", "5_TO_10"),
    ], now);
    expect(result.state).toBe("RAIN_AHEAD");
    expect(result.shouldNotify).toBe(false);
  });

  it("requires three consecutive valid NO_RAIN frames before ending", () => {
    const result = interpretRainSeries([
      frame(20, "RAIN", "10_TO_20"),
      frame(25, "RAIN", "5_TO_10"),
      frame(30, "NO_RAIN"),
      frame(35, "NO_RAIN"),
      frame(40, "NO_RAIN"),
    ], now);
    expect(result.state).toBe("ENDING");
    expect(result.endingTime).toBe(t(30));
  });

  it("does not bridge an unknown gap when deciding ending", () => {
    const result = interpretRainSeries([
      frame(20, "RAIN", "10_TO_20"),
      frame(25, "NO_RAIN"),
      frame(30, "FETCH_ERROR"),
      frame(35, "NO_RAIN"),
      frame(40, "NO_RAIN"),
    ], now);
    expect(result.state).toBe("RAINING");
    expect(result.endingTime).toBeNull();
  });

  it("never interprets unknown pixels as dry", () => {
    const result = interpretRainSeries([
      frame(25, "UNKNOWN_PIXEL"),
      frame(30, "FETCH_ERROR"),
    ], now);
    expect(result.state).toBe("INSUFFICIENT_DATA");
  });
});
