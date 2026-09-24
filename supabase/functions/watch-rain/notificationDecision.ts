export type WatchRainUrgency = "INFO" | "LIFESTYLE_ACTION";

export function shouldNotifyForRain(args: {
  notificationsEnabled: boolean;
  currentUrgency: WatchRainUrgency;
  previousUrgency?: WatchRainUrgency | null;
  lastNotifiedAt?: string | null;
}) {
  const actionable = args.currentUrgency === "LIFESTYLE_ACTION";
  const becameActionable = actionable && args.previousUrgency !== "LIFESTYLE_ACTION";
  const retryPending = actionable && !args.lastNotifiedAt;
  return args.notificationsEnabled && (becameActionable || retryPending);
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
