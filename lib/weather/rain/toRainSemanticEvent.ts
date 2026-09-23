import type { RainSemanticEvent } from "../types";
import type { RainInterpretation } from "./RainInterpretationEngine";

export function toRainSemanticEvent(
  interpretation: RainInterpretation,
  checkedAt: Date,
  sourceValidAt: string | null = null,
): RainSemanticEvent | null {
  if (interpretation.state === "INSUFFICIENT_DATA") return null;

  const eventType = {
    DRY: "RAIN_CLEAR",
    RAIN_AHEAD: "RAIN_APPROACHING",
    ACTIONABLE_RAIN: "ACTIONABLE_RAIN_APPROACHING",
    RAINING: "RAINING",
    EASING: "RAIN_EASING",
    ENDING: "RAIN_ENDING",
  } as const;

  return {
    schemaVersion: 1,
    eventType: eventType[interpretation.state],
    urgency: interpretation.shouldNotify ? "LIFESTYLE_ACTION" : "INFO",
    suggestedAction: interpretation.shouldNotify ? "BRING_LAUNDRY_INSIDE" : "NONE",
    startsAt: interpretation.firstRainTime,
    actionableAt: interpretation.firstActionableRainTime,
    endingAt: interpretation.endingTime,
    source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
    checkedAt: checkedAt.toISOString(),
    sourceValidAt,
  };
}
