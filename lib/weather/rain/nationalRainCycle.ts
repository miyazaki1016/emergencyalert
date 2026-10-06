export type NationalRainCycleState = {
  lastCompletedBasetime?: string | null;
};

export type NationalRainCycleDecision =
  | { action: "SCAN"; basetime: string; reason: "NEW_BASETIME" | "RETRY_INCOMPLETE" }
  | { action: "SKIP"; basetime: string; reason: "ALREADY_COMPLETED" };

export function latestForecastBasetime(frames: Array<{ basetime: string }>): string {
  const basetimes = frames
    .map((frame) => frame.basetime)
    .filter((value) => /^\d{14}$/.test(value))
    .sort();
  const latest = basetimes.at(-1);
  if (!latest) throw new Error("No valid forecast basetime");
  return latest;
}

export function decideNationalRainCycle(
  frames: Array<{ basetime: string }>,
  state: NationalRainCycleState,
): NationalRainCycleDecision {
  const basetime = latestForecastBasetime(frames);
  if (state.lastCompletedBasetime === basetime) {
    return { action: "SKIP", basetime, reason: "ALREADY_COMPLETED" };
  }
  return {
    action: "SCAN",
    basetime,
    reason: state.lastCompletedBasetime ? "NEW_BASETIME" : "RETRY_INCOMPLETE",
  };
}

export function completedBasetimeAfterScan(input: {
  basetime: string;
  requiredFrames: number;
  usableFrames: number;
}): string | null {
  if (!Number.isInteger(input.requiredFrames) || input.requiredFrames < 1) {
    throw new Error("requiredFrames must be positive");
  }
  if (!Number.isInteger(input.usableFrames) || input.usableFrames < 0 || input.usableFrames > input.requiredFrames) {
    throw new Error("usableFrames must be between zero and requiredFrames");
  }
  return input.usableFrames === input.requiredFrames ? input.basetime : null;
}


export function shouldRetainUnresolvedRetry(input: {
  retryBasetime: string;
  latestCandidateBasetime?: string | null;
}): boolean {
  if (!/^\d{14}$/.test(input.retryBasetime)) throw new Error("invalid retryBasetime");
  if (!input.latestCandidateBasetime) return true;
  if (!/^\d{14}$/.test(input.latestCandidateBasetime)) throw new Error("invalid latestCandidateBasetime");
  return input.latestCandidateBasetime <= input.retryBasetime;
}
