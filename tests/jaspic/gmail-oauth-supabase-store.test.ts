import { describe, expect, it } from "vitest";
import { createSupabaseOAuthOnceStore, type JaspicOAuthDbClient } from "../../supabase/functions/_shared/jaspic/gmail-oauth-supabase-store";

const challenge = {
  stateHash: "a".repeat(64),
  ownerId: "valid_owner_1234",
  expiresAt: 1_800_000_300_000,
};

function fakeDb() {
  const calls: string[] = [];
  const values = new Map<string, { owner: string; expires: number }>();
  const db: JaspicOAuthDbClient = {
    from(table) {
      expect(table).toBe("jaspic_gmail_oauth_states");
      return {
        async insert(row) {
          calls.push("insert");
          values.set(row.state_hash, { owner: row.owner_id, expires: Date.parse(row.expires_at) });
          return { data: null, error: null };
        },
      };
    },
    async rpc(fn, params) {
      expect(fn).toBe("jaspic_consume_gmail_oauth_state");
      calls.push("rpc");
      const row = values.get(params.p_state_hash);
      if (!row || row.owner !== params.p_owner_id) return { data: false, error: null };
      values.delete(params.p_state_hash);
      return { data: true, error: null };
    },
  };
  return { calls, db };
}

describe("JASPIC Supabase OAuth state adapter (mock database only)", () => {
  it("inserts hash-only state and consumes through a single atomic RPC", async () => {
    const { calls, db } = fakeDb();
    const store = createSupabaseOAuthOnceStore(db);
    await store.create(challenge);
    expect(await store.consumeAtomically({
      stateHash: challenge.stateHash, ownerId: challenge.ownerId, now: challenge.expiresAt - 1000,
    })).toBe("consumed");
    expect(await store.consumeAtomically({
      stateHash: challenge.stateHash, ownerId: challenge.ownerId, now: challenge.expiresAt - 1000,
    })).toBe("invalid_or_expired");
    expect(calls).toEqual(["insert", "rpc", "rpc"]);
  });

  it("fails closed on failed RPC and does not show database error text", async () => {
    const db: JaspicOAuthDbClient = {
      from() { return { insert: async () => ({ data: null, error: null }) }; },
      rpc: async () => ({ data: null, error: { message: "internal" } }),
    };
    const store = createSupabaseOAuthOnceStore(db);
    await expect(store.consumeAtomically({
      stateHash: challenge.stateHash, ownerId: challenge.ownerId, now: 100,
    })).rejects.toThrow("JASPIC OAuth state storage unavailable");
  });
});
