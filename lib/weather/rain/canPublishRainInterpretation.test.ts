import { describe, expect, it } from "vitest";
import type { OfficialRainFrame, RainIntensityClass } from "../types";
import { interpretRainSeries } from "./RainInterpretationEngine";
import { canPublishRainInterpretation } from "./canPublishRainInterpretation";

const now = new Date("2026-09-20T11:00:00Z");
const ts = (mins: number) => new Date(now.getTime() + mins * 60_000)
  .toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
const frame = (
  mins: number,
  status: OfficialRainFrame["status"],
  intensityClass: RainIntensityClass | null = null,
): OfficialRainFrame => ({
  baseTime: ts(0), validTime: ts(mins), status, intensityClass, rgba: null,
  source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
});

describe("canPublishRainInterpretation", () => {
  it("does not let an unrelated later gap erase verified actionable rain", () => {
    const observation = [frame(0, "NO_RAIN")];
    const forecast = [
      frame(5, "NO_RAIN"),
      frame(15, "RAIN", "5_TO_10"),
      frame(40, "UNKNOWN_PIXEL"),
    ];
    const interpretation = interpretRainSeries({ now, current: observation[0], forecast });
    expect(interpretation.state).toBe("ACTIONABLE_RAIN");
    expect(canPublishRainInterpretation(interpretation, observation, forecast)).toBe(true);
  });

  it("withholds a rain-ahead claim when an unknown frame occurs before the claimed rain", () => {
    const observation = [frame(0, "NO_RAIN")];
    const forecast = [
      frame(5, "UNKNOWN_PIXEL"),
      frame(15, "RAIN", "5_TO_10"),
    ];
    const interpretation = interpretRainSeries({ now, current: observation[0], forecast });
    expect(interpretation.state).toBe("ACTIONABLE_RAIN");
    expect(canPublishRainInterpretation(interpretation, observation, forecast)).toBe(false);
  });

  it("keeps DRY fail-closed when any forecast frame is unusable", () => {
    const observation = [frame(0, "NO_RAIN")];
    const forecast = [frame(5, "NO_RAIN"), frame(10, "UNKNOWN_PIXEL")];
    const interpretation = {
      state: "DRY", shouldNotify: false, firstRainTime: null,
      firstActionableRainTime: null, endingTime: null,
    } as const;
    expect(canPublishRainInterpretation(interpretation, observation, forecast)).toBe(false);
  });
});
