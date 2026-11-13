// This is a preflight rejection guard, not a guarantee of completion.
// The route must not persist PREPARED deliveries when even the Gmail request
// timeouts would exhaust the invocation budget.
export const DISPATCH_MAX_MS = 300_000;
export const GMAIL_REQUEST_TIMEOUT_MS = 10_000;
export const DB_AND_CLEANUP_RESERVE_MS = 60_000;

export function hasBulkSendTimeBudget(candidateCount:number, elapsedMs:number):boolean {
  if (!Number.isSafeInteger(candidateCount) || candidateCount < 0) return false;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return false;
  const remaining = DISPATCH_MAX_MS - elapsedMs - DB_AND_CLEANUP_RESERVE_MS;
  return candidateCount * GMAIL_REQUEST_TIMEOUT_MS <= remaining;
}
