/**
 * Persist an absolute delivered_count, not an increment.
 * A timed-out PostgREST response may have committed; retrying the same value
 * is idempotent. A successful UPDATE response without an updated row is not proof.
 * Do not re-send Push when finalizing or repairing its database history.
 */
export type DeliveryWriteResult = { error?: { message?: string } | null; data?: Array<{ id: number; delivered_count: number }> | null };
export type FinalizationResult = { confirmed: boolean; attempts: number; reason: string | null };

export async function finalizeDeliveredCount(args: {
  notificationId: number;
  deliveredCount: number;
  write: () => Promise<DeliveryWriteResult>;
  read: () => Promise<{ error?: { message?: string } | null; data?: { delivered_count: number } | null }>;
  maxAttempts?: number;
}): Promise<FinalizationResult> {
  if (!Number.isSafeInteger(args.notificationId) || args.notificationId <= 0 ||
      !Number.isSafeInteger(args.deliveredCount) || args.deliveredCount <= 0) {
    return { confirmed: false, attempts: 0, reason: "invalid_delivery_record" };
  }
  const maxAttempts = Math.min(3, Math.max(1, Math.trunc(args.maxAttempts ?? 3)));
  let lastReason = "unconfirmed";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const written = await args.write();
      if (!written.error && written.data?.some(row =>
        row.id === args.notificationId && row.delivered_count === args.deliveredCount)) {
        return { confirmed: true, attempts: attempt, reason: null };
      }
      lastReason = written.error?.message ?? "write_not_confirmed";
    } catch {
      lastReason = "write_exception";
    }
    // The write may have committed before a timeout. Inspect server state
    // before another absolute-value update; never retry the actual Push.
    try {
      const read = await args.read();
      if (!read.error && read.data?.delivered_count === args.deliveredCount) {
        return { confirmed: true, attempts: attempt, reason: null };
      }
      if (read.error) lastReason = "read_failed_after_" + lastReason;
    } catch {
      lastReason = "read_exception_after_" + lastReason;
    }
  }
  return { confirmed: false, attempts: maxAttempts, reason: lastReason };
}
