/**
 * Issue #238 / #235: bounded dispatch selection.
 * Pure scheduling helper: it never writes a delivery ledger or sends mail.
 * The caller must atomically reserve the selected candidates and keep the
 * unselected ones pending; it must not advance a source snapshot past them.
 */
export const JASPIC_MAX_BATCH_SIZE = 20;
export const JASPIC_MIN_SEND_REMAINING_MS = 60_000;
export const JASPIC_GMAIL_WORST_CASE_MS = 10_000;

export function selectDispatchBatch<T>(
  pending: readonly T[],
  remainingMs: number,
  maxBatchSize = JASPIC_MAX_BATCH_SIZE,
): { selected: T[]; remaining: T[] } {
  if (!Number.isFinite(remainingMs) || remainingMs < 0 ||
      !Number.isSafeInteger(maxBatchSize) || maxBatchSize < 1 || maxBatchSize > JASPIC_MAX_BATCH_SIZE) {
    throw new Error("INVALID_BATCH_BUDGET");
  }
  const safeTime = Math.max(0, remainingMs - JASPIC_MIN_SEND_REMAINING_MS);
  const capacity = Math.min(maxBatchSize, Math.floor(safeTime / JASPIC_GMAIL_WORST_CASE_MS));
  return {selected: pending.slice(0, capacity), remaining: pending.slice(capacity)};
}
