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
