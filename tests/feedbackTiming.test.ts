import { describe, expect, it } from "vitest";
import { feedbackTooEarly, forecastTargetEpoch } from "../lib/weather/rain/feedbackTiming";

describe("weather feedback timing", () => {
  const target = "20261019121500";
  const before = Date.parse("2026-10-19T12:14:59Z");
  const at = Date.parse("2026-10-19T12:15:00Z");
  it("blocks premature did-not-rain and did-not-stop results", () => {
    expect(feedbackTooEarly("DID_NOT_RAIN", target, before)).toBe(true);
    expect(feedbackTooEarly("DID_NOT_STOP", target, before)).toBe(true);
    expect(feedbackTooEarly("DID_NOT_RAIN", target, at)).toBe(false);
    expect(feedbackTooEarly("DID_NOT_STOP", target, at)).toBe(false);
  });
  it("allows already-raining, already-dry, rain happened, stopped and unknown immediately", () => {
    for (const result of ["ALREADY_RAINING", "ALREADY_DRY", "RAINED", "STOPPED", "UNKNOWN"]) {
      expect(feedbackTooEarly(result, target, before)).toBe(false);
    }
  });
  it("does not guess a time for old notifications with missing forecast evidence", () => {
    expect(feedbackTooEarly("DID_NOT_RAIN", null, before)).toBe(false);
    expect(forecastTargetEpoch("20260230000000")).toBeNull();
    expect(forecastTargetEpoch("20261019126000")).toBeNull();
  });
});
