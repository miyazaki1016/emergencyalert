/**
 * Persistence adapter contract for one-time Gmail OAuth state consumption.
 * IMPORTANT: no in-memory Map fallback, network I/O, or real DB calls.
 *
 * A production adapter must atomically consume a hashed state in a shared
 * transaction with the expected owner; do not use a SELECT-then-DELETE.
 */
export type OAuthOnceOutcome = "consumed" | "invalid_or_expired";
export type OAuthOnceChallenge = {
  stateHash: string;
  ownerId: string;
  expiresAt: number;
};
export type OAuthOnceConsumeRequest = { stateHash: string; ownerId: string; now: number };

/** Database transaction semantics required by a future persistent implementation. */
export interface OAuthOnceStore {
  /** Exactly one winner, even across instances and concurrent callbacks. */
  consumeAtomically(input: OAuthOnceConsumeRequest): Promise<OAuthOnceOutcome>;
  /** Reject duplicate state hash, never overwrite an existing transaction. */
  create(input: OAuthOnceChallenge): Promise<void>;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash state before storing it in the database; raw state stays in the sealed cookie. */
export async function hashGmailOAuthStateOffline(state: string): Promise<string> {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(state)) throw new Error("Invalid OAuth state");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
  return toHex(new Uint8Array(hash));
}

export function validateOAuthOwnerIdOffline(ownerId: string): string {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(ownerId)) throw new Error("Invalid OAuth owner");
  return ownerId;
}

export async function registerOAuthStateOffline(
  store: OAuthOnceStore,
  state: string,
  ownerId: string,
  expiresAt: number,
): Promise<void> {
  validateOAuthOwnerIdOffline(ownerId);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0) throw new Error("Invalid OAuth expiry");
  await store.create({ stateHash: await hashGmailOAuthStateOffline(state), ownerId, expiresAt });
}

export async function consumeOAuthStateOffline(
  store: OAuthOnceStore,
  state: string,
  ownerId: string,
  now = Date.now(),
): Promise<boolean> {
  validateOAuthOwnerIdOffline(ownerId);
  if (!Number.isSafeInteger(now) || now <= 0) throw new Error("Invalid OAuth clock");
  const response = await store.consumeAtomically({
    stateHash: await hashGmailOAuthStateOffline(state), ownerId, now,
  });
  if (response !== "consumed" && response !== "invalid_or_expired") {
    throw new Error("Unexpected OAuth state store response");
  }
  return response === "consumed";
}
