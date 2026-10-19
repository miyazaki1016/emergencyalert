import { describe, expect, it } from "vitest";
import { assessEndingShadow } from "../supabase/functions/watch-rain/endingShadow";

const frames = (statuses: string[]) => statuses.map((status, i) => ({
  status,
  validTime: `2026101912${String(i * 5).padStart(2, "0")}00`,
}));

describe("ending shadow (diagnostic only)", () => {
  it("records a return of rain after a 3-frame clear spell", () => {
    expect(assessEndingShadow({
      currentStatus: "RAIN",
      endingTime: "20261019120000",
      forecast: frames(["NO_RAIN", "NO_RAIN", "NO_RAIN", "RAIN", "NO_RAIN"]),
    })).toMatchObject({
      status: "RE_RAIN_FORECAST",
      dryFramesFromEnding: 3,
      firstReRainTime: "20261019121500",
    });
  });
  it("does not count a 15-minute lull as lasting cessation", () => {
    expect(assessEndingShadow({
      currentStatus: "RAIN",
      endingTime: "20261019120000",
      forecast: frames(["NO_RAIN", "NO_RAIN", "NO_RAIN", "NO_RAIN"]),
    })).toMatchObject({ status: "INSUFFICIENT_FORECAST", coverageMinutes: 15, dryFramesFromEnding: 4 });
  });
  it("requires a complete 30-minute continuous dry horizon (still not observed weather)", () => {
    expect(assessEndingShadow({
      currentStatus: "RAIN",
      endingTime: "20261019120000",
      forecast: frames(Array(7).fill("NO_RAIN")),
    })).toMatchObject({ status: "CLEAR_THROUGH_AVAILABLE_HORIZON", coverageMinutes: 30, dryFramesFromEnding: 7 });
  });
  it("rejects insufficient coverage and unknown pixels", () => {
    expect(assessEndingShadow({
      currentStatus: "RAIN",
      endingTime: "20261019120000",
      forecast: frames(["NO_RAIN", "NO_DATA", "NO_RAIN"]),
    }).status).toBe("INSUFFICIENT_FORECAST");
    expect(assessEndingShadow({
      currentStatus: "RAIN",
      endingTime: "20261019120000",
      forecast: frames(["NO_RAIN", "NO_RAIN"]),
    }).status).toBe("INSUFFICIENT_FORECAST");
  });
  it("does not skip the start of the ending window or gaps in the forecast", () => {
    expect(assessEndingShadow({
      currentStatus: "RAIN", endingTime: "20261019120000",
      forecast: frames(["NO_RAIN", "NO_RAIN", "NO_RAIN", "NO_RAIN"]).slice(1),
    }).status).toBe("INSUFFICIENT_FORECAST");
    expect(assessEndingShadow({
      currentStatus: "RAIN", endingTime: "20261019120000",
      forecast: frames(["NO_RAIN", "NO_RAIN", "NO_RAIN", "NO_RAIN"]).filter((_, index) => index !== 1),
    }).status).toBe("INSUFFICIENT_FORECAST");
  });
  it("distinguishes already-dry and no ending predictions", () => {
    expect(assessEndingShadow({
      currentStatus: "NO_RAIN", endingTime: "20261019120000", forecast: frames(["NO_RAIN", "NO_RAIN", "NO_RAIN"]),
    }).status).toBe("NOT_CURRENTLY_RAINING");
    expect(assessEndingShadow({
      currentStatus: "RAIN", endingTime: null, forecast: [],
    }).status).toBe("NO_ENDING");
  });
});
