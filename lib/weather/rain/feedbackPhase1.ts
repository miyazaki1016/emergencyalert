/** First-release feedback navigation; hash is a lookup key, not authorization. */
export function parseFeedbackHash(hash: string): number | null {
  const match = /^#rain-feedback-([1-9]\d{0,14})$/.exec(hash);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}

/** Existing delivered notifications have no persisted forecast target time.
 * Negative outcomes require a conservative wait and remain user reports,
 * not verified accuracy measurements.
 */
export function negativeFeedbackNeedsWait(
  answer: string,
  deliveredAt: string,
  now: number,
): boolean {
  if (answer !== "DID_NOT_RAIN" && answer !== "DID_NOT_STOP") return false;
  const deliveredMs = Date.parse(deliveredAt);
  return !Number.isFinite(deliveredMs) || now < deliveredMs + 60 * 60 * 1000;
}

/** Tie the eyewitness answer to the watched place, not the device's current location. */
export function watchedPlaceLabel(targetId: string, labels: Readonly<Record<string,string>>): string {
  const label = labels[targetId]?.trim();
  return label || "登録地点（名称を確認できないよ）";
}

/** This is a view filter only; it never changes notification ownership or permissions. */
export function filterFeedbackByTarget<T extends {target_id:string}>(
  notifications: readonly T[],
  selectedTargetId: string,
): T[] {
  return selectedTargetId === "all"
    ? [...notifications]
    : notifications.filter(row => row.target_id === selectedTargetId);
}

/**
 * A history filter should not hide the notification selected from the
 * "today's latest alert" link, even if that answer was already saved.
 */
export function selectFeedbackHistory<T extends { id: number; event_type: string }>(
  notifications: readonly T[],
  answers: Readonly<Record<number, string>>,
  supportedEventTypes: ReadonlySet<string>,
  filter: "all" | "unanswered" | "answered",
  focusedId: number | null,
): { visible: T[]; answerable: number; unanswered: number; answered: number } {
  const answerable = notifications.filter(item => supportedEventTypes.has(item.event_type));
  const unanswered = answerable.filter(item => !answers[item.id]).length;
  const visible = notifications.filter(item => {
    if (item.id === focusedId) return true;
    if (filter === "all") return true;
    if (!supportedEventTypes.has(item.event_type)) return false;
    return filter === "answered" ? Boolean(answers[item.id]) : !answers[item.id];
  });
  return {
    visible,
    answerable: answerable.length,
    unanswered,
    answered: answerable.length - unanswered,
  };
}
