import { describe, expect, it, vi } from "vitest";
import { createSupabaseOAuthOnceStore, type JaspicOAuthDbClient } from "../../lib/jaspic/oauth-supabase-store";
const ownerId = "12345678-1234-1234-1234-123456789abc";
const stateHash = "a".repeat(64);
describe("Supabase OAuth one-time state adapter (mock only)", () => {
  it("registers a hashed state and consumes it using the atomic RPC", async () => {
    const insert = vi.fn(async (_row: {state_hash:string}) => ({ data: null, error: null }));
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    const db = { from: () => ({ insert }), rpc } as unknown as JaspicOAuthDbClient;
    const store = createSupabaseOAuthOnceStore(db);
    await store.create({ stateHash, ownerId, expiresAt: Date.now() + 300000 });
    expect(insert).toHaveBeenCalledOnce();
    expect(insert.mock.calls[0][0].state_hash).toBe(stateHash);
    expect(await store.consumeAtomically({ stateHash, ownerId, now: Date.now() })).toBe("consumed");
    expect(rpc).toHaveBeenCalledWith("jaspic_consume_gmail_oauth_state", { p_state_hash: stateHash, p_owner_id: ownerId });
  });
  it("fails closed on storage errors and invalid RPC results", async () => {
    const db = {
      from: () => ({ insert: async () => ({ data: null, error: { message: "db unavailable" } }) }),
      rpc: async () => ({ data: null, error: null }),
    } as unknown as JaspicOAuthDbClient;
    const store = createSupabaseOAuthOnceStore(db);
    await expect(store.create({ stateHash, ownerId, expiresAt: Date.now() + 300000 })).rejects.toThrow();
    await expect(store.consumeAtomically({ stateHash, ownerId, now: Date.now() })).rejects.toThrow();
  });
});
