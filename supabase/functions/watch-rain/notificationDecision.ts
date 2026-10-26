export type WatchRainUrgency = "INFO" | "LIFESTYLE_ACTION";

export function shouldNotifyForRain(args: {
  notificationsEnabled: boolean;
  currentUrgency: WatchRainUrgency;
  previousUrgency?: WatchRainUrgency | null;
  lastNotifiedAt?: string | null;
  rainEnding?: boolean;
}) {
  const actionable = args.currentUrgency === "LIFESTYLE_ACTION";
  return args.notificationsEnabled && (Boolean(args.rainEnding) || (actionable && !args.lastNotifiedAt));
}


export function nextLastNotifiedAt(args: {
  delivered: number;
  actionable: boolean;
  previousLastNotifiedAt?: string | null;
  now: string;
}) {
  if (args.delivered > 0) return args.now;
  return args.previousLastNotifiedAt ?? null;
}

export function nextRainEndingNotified(args: {
  previousRainEndingNotified: boolean;
  rainStreak: number;
  endingDelivered: boolean;
}) {
  if (args.endingDelivered) return true;
  return args.previousRainEndingNotified;
}

/** A repeated fetch of the same observation must not advance a weather streak. */
export function advanceObservationStreak(args: {
  status: string | null;
  validAt: string | null;
  previousValidAt: string | null;
  previousRainStreak: number;
  previousClearStreak: number;
}) {
  const { status, validAt, previousValidAt } = args;
  const fresh = Boolean(validAt && /^\\d{14}$/.test(validAt) && (!previousValidAt || (validAt > previousValidAt)));
  if (!fresh || (status !== "RAIN" && status !== "NO_RAIN")) return {
    rainStreak: args.previousRainStreak, clearStreak: args.previousClearStreak,
    observationValidAt: previousValidAt,
  };
  return {
    rainStreak: status === "RAIN" ? Math.min(args.previousRainStreak + 1, 3) : 0,
    clearStreak: status === "NO_RAIN" ? Math.min(args.previousClearStreak + 1, 3) : 0,
    observationValidAt: validAt,
  };
}
