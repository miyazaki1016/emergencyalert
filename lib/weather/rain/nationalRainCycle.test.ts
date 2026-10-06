import { describe, expect, test } from "vitest";
import {
  completedBasetimeAfterScan,
  decideNationalRainCycle,
  latestForecastBasetime,
} from "./nationalRainCycle";

const frames = [
  { basetime: "20261006030000" },
  { basetime: "20261006030000" },
  { basetime: "20261006030000" },
];

describe("national rain basetime cycle contract", () => {
  test("selects the latest valid basetime", () => {
    expect(latestForecastBasetime([
      { basetime: "20261006025500" },
      { basetime: "invalid" },
      { basetime: "20261006030000" },
    ])).toBe("20261006030000");
  });

  test("scans a new basetime", () => {
    expect(decideNationalRainCycle(frames, { lastCompletedBasetime: "20261006025500" })).toEqual({
      action: "SCAN",
      basetime: "20261006030000",
      reason: "NEW_BASETIME",
    });
  });

  test("skips an already completed basetime before repeating the nationwide scan", () => {
    expect(decideNationalRainCycle(frames, { lastCompletedBasetime: "20261006030000" })).toEqual({
      action: "SKIP",
      basetime: "20261006030000",
      reason: "ALREADY_COMPLETED",
    });
  });

  test("retries the same basetime until every required frame is usable", () => {
    const completed = completedBasetimeAfterScan({
      basetime: "20261006030000",
      requiredFrames: 12,
      usableFrames: 11,
    });
    expect(completed).toBeNull();
    expect(decideNationalRainCycle(frames, { lastCompletedBasetime: completed })).toEqual({
      action: "SCAN",
      basetime: "20261006030000",
      reason: "RETRY_INCOMPLETE",
    });
  });

  test("marks the basetime completed only after all required frames are usable", () => {
    expect(completedBasetimeAfterScan({
      basetime: "20261006030000",
      requiredFrames: 12,
      usableFrames: 12,
    })).toBe("20261006030000");
  });
});
