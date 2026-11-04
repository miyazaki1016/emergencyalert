import { describe, expect, it } from "vitest";
import {
  consumeOAuthStateOffline, hashGmailOAuthStateOffline,
  registerOAuthStateOffline, type OAuthOnceStore, type OAuthOnceChallenge,
} from "../../supabase/functions/_shared/jaspic/gmail-oauth-once-offline";

function syntheticAtomicStore(): OAuthOnceStore {
  const table = new Map<string, OAuthOnceChallenge>();
  return {
    async create(input) {
      if (table.has(input.stateHash)) throw new Error("Duplicate OAuth state");
      table.set(input.stateHash, input);
    },
    async consumeAtomically(input) {
      const record = table.get(input.stateHash);
      if (!record || record.ownerId !== input.ownerId || record.expiresAt <= input.now) {
        return "invalid_or_expired";
      }
      table.delete(input.stateHash);
      return "consumed";
    },
  };
}

describe("OAuth state single use offline contract", () => {
  const state = "s".repeat(43);
  const owner = "syntheticOwner123";
  const now = 1_800_000_000_000;
  it("hashes state before persistence, uses a one-time consume contract", async () => {
    const store = syntheticAtomicStore();
    const hash = await hashGmailOAuthStateOffline(state);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(state);
    await registerOAuthStateOffline(store, state, owner, now + 60_000);
    expect(await consumeOAuthStateOffline(store, state, owner, now)).toBe(true);
    expect(await consumeOAuthStateOffline(store, state, owner, now)).toBe(false);
  });
  it("models atomic consumption where concurrent callbacks have one winner", async () => {
    const store = syntheticAtomicStore();
    await registerOAuthStateOffline(store, state, owner, now + 60_000);
    const results = await Promise.all(Array.from({length: 16}, () =>
      consumeOAuthStateOffline(store, state, owner, now)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it("rejects wrong owner, expired session and invalid state", async () => {
    const store = syntheticAtomicStore();
    await registerOAuthStateOffline(store, state, owner, now + 10);
    expect(await consumeOAuthStateOffline(store, state, "differentOwner12", now)).toBe(false);
    expect(await consumeOAuthStateOffline(store, state, owner, now + 11)).toBe(false);
    await expect(registerOAuthStateOffline(store, "bad", owner, now + 100)).rejects.toThrow();
  });
});
