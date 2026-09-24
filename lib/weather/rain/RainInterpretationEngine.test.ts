import { describe, expect, it } from "vitest";
import type { OfficialRainFrame, RainIntensityClass } from "../types";
import { interpretRainSeries } from "./RainInterpretationEngine";
import { toRainSemanticEvent } from "./toRainSemanticEvent";

const SOURCE = "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST" as const;
const jmaTime = (d: Date) => d.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

function frame(now: Date, minutes: number, status: "RAIN" | "NO_RAIN", intensityClass: RainIntensityClass | null): OfficialRainFrame {
  return { baseTime: jmaTime(now), validTime: jmaTime(new Date(now.getTime() + minutes * 60_000)), status, intensityClass, rgba: null, source: SOURCE };
}

describe("actionable rain boundary", () => {
  const now = new Date("2026-09-24T06:00:00.000Z");
  const current = frame(now, 0, "NO_RAIN", null);

  it("promotes 5mm/h-or-more rain at 30 minutes to LIFESTYLE_ACTION", () => {
    const forecast = [frame(now, 5, "NO_RAIN", null), frame(now, 30, "RAIN", "5_TO_10")];
    const interpretation = interpretRainSeries({ now, current, forecast });
    const event = toRainSemanticEvent(interpretation, now, current.validTime);
    expect(interpretation.state).toBe("ACTIONABLE_RAIN");
    expect(interpretation.shouldNotify).toBe(true);
    expect(event?.eventType).toBe("ACTIONABLE_RAIN_APPROACHING");
    expect(event?.urgency).toBe("LIFESTYLE_ACTION");
    expect(event?.suggestedAction).toBe("BRING_LAUNDRY_INSIDE");
  });

  it("does not notify for the same intensity beyond 30 minutes", () => {
    const interpretation = interpretRainSeries({ now, current, forecast: [frame(now, 31, "RAIN", "5_TO_10")] });
    const event = toRainSemanticEvent(interpretation, now, current.validTime);
    expect(interpretation.state).toBe("RAIN_AHEAD");
    expect(interpretation.shouldNotify).toBe(false);
    expect(event?.urgency).toBe("INFO");
  });

  it("does not notify for rain below 5mm/h inside 30 minutes", () => {
    const interpretation = interpretRainSeries({ now, current, forecast: [frame(now, 20, "RAIN", "1_TO_5")] });
    const event = toRainSemanticEvent(interpretation, now, current.validTime);
    expect(interpretation.state).toBe("RAIN_AHEAD");
    expect(interpretation.shouldNotify).toBe(false);
    expect(event?.urgency).toBe("INFO");
  });
});
