import { describe, expect, it } from "vitest";
import { assessEndingShadow } from "../supabase/functions/watch-rain/endingShadow";
const frames = (statuses: string[]) => statuses.map((status, i) => ({
  status, validTime: `2026101912${String(i * 5).padStart(2, "0")}00`,
}));
const assess = (statuses: string[]) => assessEndingShadow({
  currentStatus: "RAIN", endingTime: "20261019120000", forecast: frames(statuses),
});

describe("ending shadow: independent 10/15/30 minute horizons, never push gating", () => {
  it("distinguishes an imminent short respite from renewed rain at 15 minutes", () => {
    const result = assess(["NO_RAIN", "NO_RAIN", "NO_RAIN", "RAIN", "NO_RAIN"]);
    expect(result.status).toBe("RE_RAIN_FORECAST");
    expect(result.windows["10"].status).toBe("CLEAR_FORECAST");
    expect(result.windows["15"]).toEqual({ status: "RE_RAIN_FORECAST", reRainTime: "20261019121500" });
    expect(result.windows["30"].status).toBe("RE_RAIN_FORECAST");
    expect(result.dryFramesFromEnding).toBe(3);
  });
  it("keeps unknown horizon unknown rather than requiring 30 minutes to recognize a forecast lull", () => {
    const result = assess(["NO_RAIN", "NO_RAIN", "NO_RAIN", "NO_RAIN"]);
    expect(result.status).toBe("CLEAR_THROUGH_AVAILABLE_HORIZON");
    expect(result.windows["10"].status).toBe("CLEAR_FORECAST");
    expect(result.windows["15"].status).toBe("CLEAR_FORECAST");
    expect(result.windows["30"].status).toBe("INSUFFICIENT_FORECAST");
    expect(result.coverageMinutes).toBe(15);
  });
  it("recognizes 30-minute dry outlook when all seven five-minute frames are present", () => {
    const result = assess(Array(7).fill("NO_RAIN"));
    expect(result.windows["10"].status).toBe("CLEAR_FORECAST");
    expect(result.windows["15"].status).toBe("CLEAR_FORECAST");
    expect(result.windows["30"].status).toBe("CLEAR_FORECAST");
    expect(result.coverageMinutes).toBe(30);
  });
  it("rejects missing starting frame, gaps and unknown statuses", () => {
    const missingStart = assessEndingShadow({ currentStatus: "RAIN", endingTime: "20261019120000", forecast: frames(["NO_RAIN","NO_RAIN","NO_RAIN"]).slice(1) });
    expect(missingStart.windows["10"].status).toBe("INSUFFICIENT_FORECAST");
    const gap = assessEndingShadow({ currentStatus: "RAIN", endingTime: "20261019120000", forecast: frames(["NO_RAIN","NO_RAIN","NO_RAIN","NO_RAIN"]).filter((_,i)=>i!==1) });
    expect(gap.windows["10"].status).toBe("INSUFFICIENT_FORECAST");
    expect(assess(["NO_RAIN","NO_DATA","NO_RAIN"]).windows["10"].status).toBe("INSUFFICIENT_FORECAST");
  });
  it("does not treat the current observed dry status as proof of pending cessation", () => {
    expect(assessEndingShadow({currentStatus: "NO_RAIN",endingTime:"20261019120000",forecast:frames(Array(7).fill("NO_RAIN"))}).status).toBe("NOT_CURRENTLY_RAINING");
    expect(assessEndingShadow({currentStatus: "RAIN",endingTime:null,forecast:[]}).status).toBe("NO_ENDING");
  });
  it("does not label missing or invalid current radar as dry", () => {
    for (const currentStatus of [null, "NO_DATA", "UNKNOWN"]) {
      const result = assessEndingShadow({
        currentStatus, endingTime: "20261019120000",
        forecast: frames(Array(7).fill("NO_RAIN")),
      });
      expect(result.status).toBe("INSUFFICIENT_FORECAST");
      expect(result.windows["10"].status).toBe("INSUFFICIENT_FORECAST");
    }
  });
  it("does not infer rain returning beyond a short available horizon", () => {
    const result = assess(["NO_RAIN","NO_RAIN","NO_RAIN"]);
    expect(result.windows["10"].status).toBe("CLEAR_FORECAST");
    expect(result.windows["15"].status).toBe("INSUFFICIENT_FORECAST");
    expect(result.windows["30"].status).toBe("INSUFFICIENT_FORECAST");
  });
});
