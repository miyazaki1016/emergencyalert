import { describe, expect, it } from "vitest";
import type { OfficialRainFrame, RainIntensityClass } from "../types";
import { interpretRainSeries } from "./RainInterpretationEngine";
import { canPublishRainInterpretation } from "./canPublishRainInterpretation";
import { formatRainMessage } from "./formatRainMessage";
import { toRainSemanticEvent } from "./toRainSemanticEvent";

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

function pipeline(
  current: OfficialRainFrame,
  forecast: OfficialRainFrame[],
  expectedForecastFrames?: number,
) {
  const observation = [current];
  const interpretation = interpretRainSeries({
    now, current, forecast, expectedForecastFrames,
  });
  const enabled = canPublishRainInterpretation(interpretation, observation, forecast);
  return {
    interpretation,
    enabled,
    event: enabled ? toRainSemanticEvent(interpretation, now) : null,
    message: enabled ? formatRainMessage(interpretation, now) : null,
  };
}

describe("rain user-facing pipeline", () => {
  it("turns verified near-term actionable rain into the laundry-saving event and copy", () => {
    const result = pipeline(
      frame(0, "NO_RAIN"),
      [frame(5, "NO_RAIN"), frame(15, "RAIN", "5_TO_10"), frame(40, "UNKNOWN_PIXEL")],
    );

    expect(result.enabled).toBe(true);
    expect(result.event).toMatchObject({
      eventType: "ACTIONABLE_RAIN_APPROACHING",
      urgency: "LIFESTYLE_ACTION",
      suggestedAction: "BRING_LAUNDRY_INSIDE",
      actionableAt: ts(15),
    });
    expect(result.message?.headline).toContain("ちゃんとした雨くるよ");
    expect(result.message?.detail).toContain("洗濯物");
  });

  it("withholds the entire user-facing claim when evidence is unknown before the rain", () => {
    const result = pipeline(
      frame(0, "NO_RAIN"),
      [frame(5, "UNKNOWN_PIXEL"), frame(15, "RAIN", "5_TO_10")],
    );

    expect(result.enabled).toBe(false);
    expect(result.event).toBeNull();
    expect(result.message).toBeNull();
  });

  it("publishes dry only from complete usable expected coverage", () => {
    const forecast = [frame(5, "NO_RAIN"), frame(10, "NO_RAIN"), frame(15, "NO_RAIN")];
    const result = pipeline(frame(0, "NO_RAIN"), forecast, 3);

    expect(result.enabled).toBe(true);
    expect(result.interpretation.state).toBe("DRY");
    expect(result.event?.eventType).toBe("RAIN_CLEAR");
    expect(result.message?.headline).toContain("雨の予報は出てない");
  });
});
