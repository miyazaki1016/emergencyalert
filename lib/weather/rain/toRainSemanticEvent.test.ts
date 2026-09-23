import { describe, expect, it } from "vitest";
import type { RainInterpretation } from "./RainInterpretationEngine";
import { toRainSemanticEvent } from "./toRainSemanticEvent";

const checkedAt = new Date("2026-09-20T12:00:00.000Z");

function interpretation(overrides: Partial<RainInterpretation>): RainInterpretation {
  return {
    state: "DRY",
    shouldNotify: false,
    firstRainTime: null,
    firstActionableRainTime: null,
    endingTime: null,
    ...overrides,
  };
}

describe("toRainSemanticEvent", () => {
  it("turns actionable rain into a consumer-ready laundry event", () => {
    const event = toRainSemanticEvent(
      interpretation({
        state: "ACTIONABLE_RAIN",
        shouldNotify: true,
        firstRainTime: "20260920122000",
        firstActionableRainTime: "20260920122500",
      }),
      checkedAt,
    );

    expect(event).toEqual({
      schemaVersion: 1,
      eventType: "ACTIONABLE_RAIN_APPROACHING",
      urgency: "LIFESTYLE_ACTION",
      suggestedAction: "BRING_LAUNDRY_INSIDE",
      startsAt: "20260920122000",
      actionableAt: "20260920122500",
      endingAt: null,
      source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
      checkedAt: "2026-09-20T12:00:00.000Z",
      sourceValidAt: null,
    });
  });

  it("does not manufacture an event when data is insufficient", () => {
    expect(toRainSemanticEvent(
      interpretation({ state: "INSUFFICIENT_DATA" }),
      checkedAt,
    )).toBeNull();
  });

  it("keeps ordinary rain-ahead informational and action-free", () => {
    const event = toRainSemanticEvent(
      interpretation({
        state: "RAIN_AHEAD",
        firstRainTime: "20260920124000",
      }),
      checkedAt,
    );

    expect(event?.eventType).toBe("RAIN_APPROACHING");
    expect(event?.urgency).toBe("INFO");
    expect(event?.suggestedAction).toBe("NONE");
  });

  it("exposes ending without inventing a lifestyle action", () => {
    const event = toRainSemanticEvent(
      interpretation({
        state: "ENDING",
        firstRainTime: "20260920120000",
        endingTime: "20260920121500",
      }),
      checkedAt,
    );

    expect(event?.eventType).toBe("RAIN_ENDING");
    expect(event?.endingAt).toBe("20260920121500");
    expect(event?.suggestedAction).toBe("NONE");
  });
});
