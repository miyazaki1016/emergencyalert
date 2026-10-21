/** Keep the notification opened from Push visible before the general recent list. */
export function prioritizeNotification<T extends { id: number }>(
  notifications: readonly T[],
  selectedId: number | null,
): T[] {
  if (selectedId === null) return [...notifications];
  const index = notifications.findIndex(notification => notification.id === selectedId);
  if (index < 1) return [...notifications];
  return [notifications[index], ...notifications.slice(0, index), ...notifications.slice(index + 1)];
}

/** Mark only the response which has actually been saved (not just tapped). */
export function savedWeatherAnswerLabel(
  choice: string | undefined,
  options: readonly (readonly [string, string])[] | null,
): string | null {
  if (!choice || !options) return null;
  const selected = options.find(([value]) => value === choice);
  return selected ? `回答済み：${selected[1]}` : null;
}

/**
 * An unanswered filter is a convenience for people reviewing their Push alerts.
 * Unsupported notification types are excluded from its denominator.
 * The explicitly opened Push remains visible even when already answered.
 */
export function selectFeedbackHistory<T extends { id: number }>(
  notifications: readonly T[],
  answers: Readonly<Record<number, string>>,
  canAnswer: (notification: T) => boolean,
  filter: "all" | "unanswered",
  focusedId: number | null,
): { items: T[]; answerable: number; unanswered: number } {
  const answerable = notifications.filter(canAnswer);
  const unanswered = answerable.filter(item => !answers[item.id]);
  const selected = filter === "unanswered"
    ? notifications.filter(item =>
        item.id === focusedId || (canAnswer(item) && !answers[item.id]))
    : [...notifications];
  return {
    items: prioritizeNotification(selected, focusedId),
    answerable: answerable.length,
    unanswered: unanswered.length,
  };
}

/** IDs identify a record to look up; they never authorize access. */
export function parsePushNotificationId(raw: string | null): number | null {
  if (!raw || !/^[1-9]\d{0,14}$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}
