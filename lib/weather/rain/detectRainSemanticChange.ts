import type { RainSemanticEvent } from "../types";

export type RainSemanticTransition =
  | "INITIAL"
  | "UNCHANGED"
  | "BECAME_ACTIONABLE"
  | "CHANGED";

export interface RainSemanticChange {
  transition: RainSemanticTransition;
  shouldNotify: boolean;
}

/**
 * Decides whether a newly grounded semantic event is worth surfacing.
 * This layer never interprets weather data; it only compares already-grounded
 * EmergencyAlert events.
 */
export function detectRainSemanticChange(
  previous: RainSemanticEvent | null,
  current: RainSemanticEvent,
): RainSemanticChange {
  if (!previous) {
    return {
      transition: "INITIAL",
      shouldNotify: current.urgency === "LIFESTYLE_ACTION",
    };
  }

  const sameMeaning =
    previous.eventType === current.eventType &&
    previous.urgency === current.urgency &&
    previous.suggestedAction === current.suggestedAction &&
    previous.startsAt === current.startsAt &&
    previous.actionableAt === current.actionableAt &&
    previous.endingAt === current.endingAt;

  if (sameMeaning) {
    return { transition: "UNCHANGED", shouldNotify: false };
  }

  const becameActionable =
    previous.urgency !== "LIFESTYLE_ACTION" &&
    current.urgency === "LIFESTYLE_ACTION";

  return {
    transition: becameActionable ? "BECAME_ACTIONABLE" : "CHANGED",
    shouldNotify: becameActionable,
  };
}
