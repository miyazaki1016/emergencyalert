import { describe, expect, it } from "vitest";
import { assessEndingNoticeCandidate } from "../supabase/functions/watch-rain/endingNoticeCandidate";

const forecast = (status: string[]) => status.map((value, index) => ({
  status: value,
  validTime: `2026101912${String(index * 5).padStart(2, "0")}00`,
}));
const assess = (checkedAt: string, values: string[], currentStatus="RAIN") =>
  assessEndingNoticeCandidate({
    currentStatus, checkedAt, endingTime: "20261019120000", forecast: forecast(values),
  });

describe("5-to-10 minute rain ending shadow candidate (never sends pushes)", () => {
  it("marks continuous clear through 15 minutes as a research candidate", () => {
    const result=assess("2026-10-19T11:53:00Z",["NO_RAIN","NO_RAIN","NO_RAIN","NO_RAIN"]);
    expect(result.leadMinutes).toBe(7);
    expect(result.candidate).toBe("ENDING_FORECAST");
  });
  it("distinguishes brief clear intervals from persistent ending", () => {
    const result=assess("2026-10-19T11:53:00Z",["NO_RAIN","NO_RAIN","NO_RAIN","RAIN"]);
    expect(result.candidate).toBe("TEMPORARY_ENDING_FORECAST");
  });
  it("does not pretend incomplete future data proves a durable ending", () => {
    expect(assess("2026-10-19T11:53:00Z",["NO_RAIN","NO_RAIN","NO_RAIN"]).candidate)
      .toBe("ENDING_WITH_LIMITED_HORIZON");
    expect(assess("2026-10-19T11:53:00Z",["NO_RAIN","NO_DATA","NO_RAIN"]).candidate)
      .toBe("INSUFFICIENT_FORECAST");
  });
  it("keeps too early, too late, missing timestamps and dry-now separate", () => {
    expect(assess("2026-10-19T11:45:00Z",["NO_RAIN","NO_RAIN","NO_RAIN","NO_RAIN"]).candidate)
      .toBe("TOO_EARLY_FOR_5_TO_10_MINUTE_WINDOW");
    expect(assess("2026-10-19T11:57:00Z",["NO_RAIN","NO_RAIN","NO_RAIN","NO_RAIN"]).candidate)
      .toBe("LESS_THAN_5_MINUTES_AHEAD");
    expect(assess("2026-10-19T12:01:00Z",["NO_RAIN","NO_RAIN","NO_RAIN","NO_RAIN"]).candidate)
      .toBe("ENDING_TIME_PASSED");
    expect(assess("2026-10-19T11:53:00Z",["NO_RAIN","NO_RAIN","NO_RAIN","NO_RAIN"],"NO_RAIN").candidate)
      .toBe("NOT_RAINING_NOW");
    expect(assessEndingNoticeCandidate({currentStatus:"RAIN", checkedAt:null, endingTime:"20261019120000", forecast:[]}).candidate)
      .toBe("TIME_UNKNOWN");
  });
});
