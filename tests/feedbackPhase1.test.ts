import { describe, expect, it } from "vitest";
import { negativeFeedbackNeedsWait, parseFeedbackHash } from "../lib/weather/rain/feedbackPhase1";

describe("phase-one in-app history links", () => {
  it("accepts positive numeric feedback IDs", () => {
    expect(parseFeedbackHash("#rain-feedback-1")).toBe(1);
    expect(parseFeedbackHash("#rain-feedback-45321")).toBe(45321);
  });
  it("rejects malformed and ambiguous IDs", () => {
    for (const value of ["", "#rain-feedback-0", "#rain-feedback-01", "#rain-feedback--1",
      "#rain-feedback-1x", "#rain-feedback-1.5", "#rain-feedback-9007199254740992",
      "#rain-feedback-1234567890123456", "#rain-feedback-1?x=2", "#other-1"]) {
      expect(parseFeedbackHash(value)).toBeNull();
    }
  });
});

describe("phase-one legacy notification reply timing", () => {
  const deliveredAt = "2026-10-21T05:00:00.000Z";
  const started = Date.parse(deliveredAt);
  it("holds negative answers until an hour after notification", () => {
    expect(negativeFeedbackNeedsWait("DID_NOT_RAIN", deliveredAt, started)).toBe(true);
    expect(negativeFeedbackNeedsWait("DID_NOT_STOP", deliveredAt, started + 59 * 60_000)).toBe(true);
    expect(negativeFeedbackNeedsWait("DID_NOT_RAIN", deliveredAt, started + 60 * 60_000)).toBe(false);
  });
  it("does not hold eyewitness and unknown answers", () => {
    for (const value of ["RAINED", "ALREADY_RAINING", "ALREADY_DRY", "STOPPED", "UNKNOWN"]) {
      expect(negativeFeedbackNeedsWait(value, deliveredAt, started)).toBe(false);
    }
  });
  it("never enables a negative answer with invalid delivery time", () => {
    expect(negativeFeedbackNeedsWait("DID_NOT_RAIN", "invalid", Date.now())).toBe(true);
  });
});
