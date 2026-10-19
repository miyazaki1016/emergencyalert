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
  it("records clear through only the known forecast horizon, not a guarantee", () => {
    expect(assessEndingShadow({
      currentStatus: "RAIN",
      endingTime: "20261019120000",
      forecast: frames(["NO_RAIN", "NO_RAIN", "NO_RAIN", "NO_RAIN"]),
    })).toMatchObject({ status: "CLEAR_THROUGH_AVAILABLE_HORIZON", dryFramesFromEnding: 4 });
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
  it("distinguishes already-dry and no ending predictions", () => {
    expect(assessEndingShadow({
      currentStatus: "NO_RAIN", endingTime: "20261019120000", forecast: frames(["NO_RAIN", "NO_RAIN", "NO_RAIN"]),
    }).status).toBe("NOT_CURRENTLY_RAINING");
    expect(assessEndingShadow({
      currentStatus: "RAIN", endingTime: null, forecast: [],
    }).status).toBe("NO_ENDING");
  });
});
