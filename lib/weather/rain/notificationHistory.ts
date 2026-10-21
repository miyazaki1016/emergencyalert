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
