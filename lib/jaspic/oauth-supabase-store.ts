/**
 * Supabase persistence adapter for one-time JASPIC OAuth state, prepared but
 * not wired into any deployed route. ONLY instantiate on an authenticated
 * server with an appropriately restricted service-role client.
 *
 * DB RPC performs the actual atomic consume; the JS adapter does not
 * simulate a transaction or trust the application server's clock.
 */
import type {
  OAuthOnceChallenge, OAuthOnceConsumeRequest, OAuthOnceOutcome, OAuthOnceStore,
} from "./oauth-once-offline";

type DbResult<T> = { data: T | null; error: { message: string } | null };
type InsertTarget = {
  insert: (input: { state_hash: string; owner_id: string; expires_at: string }) =>
    PromiseLike<DbResult<unknown>>;
};
/** Narrow interface allows unit-testing without real credentials or DB traffic. */
export interface JaspicOAuthDbClient {
  from(table: "jaspic_gmail_oauth_states"): InsertTarget;
  rpc(
    fn: "jaspic_consume_gmail_oauth_state",
    params: { p_state_hash: string; p_owner_id: string },
  ): PromiseLike<DbResult<boolean>>;
}

function fail(): never {
  // Avoid leaking DB error details or request identifiers into logs/UI.
  throw new Error("JASPIC OAuth state storage unavailable");
}

export function createSupabaseOAuthOnceStore(db: JaspicOAuthDbClient): OAuthOnceStore {
  return {
    async create(input: OAuthOnceChallenge): Promise<void> {
      const isoDate = new Date(input.expiresAt);
      if (!Number.isSafeInteger(input.expiresAt) ||
          Number.isNaN(isoDate.getTime()) ||
          !/^[a-f0-9]{64}$/.test(input.stateHash) ||
          !/^[A-Za-z0-9_-]{8,128}$/.test(input.ownerId)) fail();
      try {
        const result = await db.from("jaspic_gmail_oauth_states").insert({
          state_hash: input.stateHash, owner_id: input.ownerId,
          expires_at: isoDate.toISOString(),
        });
        if (result.error) fail();
      } catch {
        fail();
      }
    },
    async consumeAtomically(input: OAuthOnceConsumeRequest): Promise<OAuthOnceOutcome> {
      if (!/^[a-f0-9]{64}$/.test(input.stateHash) ||
          !/^[A-Za-z0-9_-]{8,128}$/.test(input.ownerId) ||
          !Number.isSafeInteger(input.now)) fail();
      try {
        const result = await db.rpc("jaspic_consume_gmail_oauth_state", {
          p_state_hash: input.stateHash,
          p_owner_id: input.ownerId,
        });
        if (result.error || typeof result.data !== "boolean") fail();
        return result.data ? "consumed" : "invalid_or_expired";
      } catch {
        fail();
      }
    },
  };
}
