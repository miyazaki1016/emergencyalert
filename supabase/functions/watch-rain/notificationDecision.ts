export type WatchRainUrgency = "INFO" | "LIFESTYLE_ACTION";

export function shouldNotifyForRain(args: {
  notificationsEnabled: boolean;
  currentUrgency: WatchRainUrgency;
  previousUrgency?: WatchRainUrgency | null;
  lastNotifiedAt?: string | null;
  rainEnding?: boolean;
}) {
  const actionable = args.currentUrgency === "LIFESTYLE_ACTION";
  const becameActionable = actionable && args.previousUrgency !== "LIFESTYLE_ACTION";
  const retryPending = actionable && !args.lastNotifiedAt;
  return args.notificationsEnabled && (Boolean(args.rainEnding) || becameActionable || retryPending);
}


export function nextLastNotifiedAt(args: {
  delivered: number;
  actionable: boolean;
  previousLastNotifiedAt?: string | null;
  now: string;
}) {
  if (args.delivered > 0) return args.now;
  if (args.actionable) return args.previousLastNotifiedAt ?? null;
  return null;
}

export function nextRainEndingNotified(args: {
  previousRainEndingNotified: boolean;
  rainStreak: number;
  endingDelivered: boolean;
}) {
  if (args.endingDelivered) return true;
  if (args.rainStreak >= 3) return false;
  return args.previousRainEndingNotified;
}

/** Convert a JMA YYYYMMDDHHmmss timestamp (UTC), or ISO timestamp, to epoch ms.
 * Invalid timestamps fail closed rather than being treated as future forecasts.
 */
export function rainForecastTimeMs(value: string | null | undefined): number {
  if (!value) return NaN;
  if (/^\d{14}$/.test(value)) {
    const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}Z`;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) && new Date(ms).toISOString() === iso.replace("Z", ".000Z") ? ms : NaN;
  }
  return /^\d{4}-\d{2}-\d{2}T/.test(value) ? Date.parse(value) : NaN;
}

/** Only forecast events within the MY rain notification horizon are eligible. */
export function isWithinRainNotificationHorizon(
  validTime: string | null | undefined,
  nowMs: number,
  horizonMinutes = 30,
): boolean {
  const timeMs = rainForecastTimeMs(validTime);
  return Number.isFinite(timeMs) &&
    timeMs >= nowMs &&
    timeMs - nowMs <= horizonMinutes * 60_000;
}
