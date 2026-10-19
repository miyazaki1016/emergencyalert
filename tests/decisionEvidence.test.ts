import { describe, expect, it } from "vitest";
import { buildNotificationDecisionEvidence } from "../supabase/functions/watch-rain/decisionEvidence";

describe("notification decision evidence snapshot", () => {
  it("preserves exact forecast classes and reason without inventing a measured rainfall", () => {
    const forecast = [{ validTime: "20261019121000", baseTime: "20261019120000", status: "RAIN", intensityClass: "1_TO_5", rgba: { r: 5, g: 10, b: 20, a: 255 } }];
    const snapshot = buildNotificationDecisionEvidence({
      checkedAt: "2026-10-19T12:00:00Z", sourceValidAt: "20261019120000",
      source: "JMA", eventType: "RAIN_ENDING", decisionEventType: "RAIN_ENDING",
      urgency: "INFO", currentStatus: "RAIN", observationRgba: null, forecast,
      endingShadow: { status: "RE_RAIN_FORECAST" },
      decisionReasons: {
        severeEscalation: false, rainEnding: true, confirmedAndEnding: false,
        returningRain: false, rainConfirmed: true, previousConfirmedWeather: "RAINING",
      },
    });
    expect(snapshot.forecast[0].intensityClass).toBe("1_TO_5");
    expect(snapshot.decisionReasons.rainEnding).toBe(true);
    expect(snapshot.endingShadow).toEqual({ status: "RE_RAIN_FORECAST" });
    expect(snapshot.motion).toEqual({ status: "UNKNOWN", reason: "NOT_COMPUTED" });
    expect(JSON.stringify(snapshot)).not.toContain("2.5mm");
    forecast[0].intensityClass = "50_TO_80";
    expect(snapshot.forecast[0].intensityClass).toBe("1_TO_5");
  });
});
