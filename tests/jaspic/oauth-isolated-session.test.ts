import { describe, expect, it } from "vitest";
import { sealGmailWebSessionOffline, openGmailWebSessionOffline } from "../../lib/jaspic/oauth-session-offline";
import { hashGmailOAuthStateOffline, registerOAuthStateOffline, consumeOAuthStateOffline, type OAuthOnceStore } from "../../lib/jaspic/oauth-once-offline";

const state = "a".repeat(43);
const verifier = "b".repeat(64);
const owner = "12345678-1234-1234-1234-123456789abc";
describe("isolated OAuth session and one-time state", () => {
  it("seals owner-bound session and rejects wrong state, key and expiry", async () => {
    const key = Buffer.alloc(32, 7).toString("base64url");
    const now = 1_700_000_000_000;
    const sealed = await sealGmailWebSessionOffline(state, verifier, key, now, owner);
    expect((await openGmailWebSessionOffline(sealed, state, key, now + 1000)).ownerId).toBe(owner);
    await expect(openGmailWebSessionOffline(sealed, "c".repeat(43), key, now + 1000)).rejects.toThrow();
    await expect(openGmailWebSessionOffline(sealed, state, Buffer.alloc(32, 8).toString("base64url"), now + 1000)).rejects.toThrow();
    await expect(openGmailWebSessionOffline(sealed, state, key, now + 301000)).rejects.toThrow();
  });
  it("hashes states and requires an atomic one-time consume adapter", async () => {
    const states = new Set<string>();
    const store: OAuthOnceStore = {
      async create(x) { if (states.has(x.stateHash)) throw new Error("duplicate"); states.add(x.stateHash); },
      async consumeAtomically(x) { if (!states.delete(x.stateHash)) return "invalid_or_expired"; return "consumed"; },
    };
    await registerOAuthStateOffline(store, state, owner, Date.now() + 300000);
    expect(await consumeOAuthStateOffline(store, state, owner)).toBe(true);
    expect(await consumeOAuthStateOffline(store, state, owner)).toBe(false);
    expect(await hashGmailOAuthStateOffline(state)).toMatch(/^[a-f0-9]{64}$/);
  });
});
