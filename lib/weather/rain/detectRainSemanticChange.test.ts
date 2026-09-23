import { describe, expect, it } from "vitest";
import type { RainSemanticEvent } from "../types";
import { detectRainSemanticChange } from "./detectRainSemanticChange";

function event(overrides: Partial<RainSemanticEvent> = {}): RainSemanticEvent {
  return {
    schemaVersion: 1,
    eventType: "RAIN_APPROACHING",
    urgency: "INFO",
    suggestedAction: "NONE",
    startsAt: "20260924001000",
    actionableAt: null,
    endingAt: null,
    source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
    checkedAt: "2026-09-23T15:00:00.000Z",
    sourceValidAt: "20260923235500",
    ...overrides,
  };
}

describe("detectRainSemanticChange", () => {
  it("notifies when the first grounded event is already actionable", () => {
    expect(detectRainSemanticChange(null, event({
      eventType: "ACTIONABLE_RAIN_APPROACHING",
      urgency: "LIFESTYLE_ACTION",
      suggestedAction: "BRING_LAUNDRY_INSIDE",
      actionableAt: "20260924001000",
    }))).toEqual({ transition: "INITIAL", shouldNotify: true });
  });

  it("does not notify just because checked/source times advanced", () => {
    const previous = event();
    const current = event({
      checkedAt: "2026-09-23T15:05:00.000Z",
      sourceValidAt: "20260924000000",
    });
    expect(detectRainSemanticChange(previous, current)).toEqual({
      transition: "UNCHANGED",
      shouldNotify: false,
    });
  });

  it("notifies when an informational event becomes actionable", () => {
    const previous = event();
    const current = event({
      eventType: "ACTIONABLE_RAIN_APPROACHING",
      urgency: "LIFESTYLE_ACTION",
      suggestedAction: "BRING_LAUNDRY_INSIDE",
      actionableAt: "20260924001000",
    });
    expect(detectRainSemanticChange(previous, current)).toEqual({
      transition: "BECAME_ACTIONABLE",
      shouldNotify: true,
    });
  });

  it("does not notify for a non-actionable semantic change", () => {
    const previous = event();
    const current = event({ eventType: "RAINING", startsAt: null });
    expect(detectRainSemanticChange(previous, current)).toEqual({
      transition: "CHANGED",
      shouldNotify: false,
    });
  });
});
