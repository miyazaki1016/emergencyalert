import { describe, expect, it, vi } from "vitest";
import { prepareJaspicIdentityCallback } from "../../lib/jaspic/oauth-identity-callback";
import { sealGmailWebSessionOffline } from "../../lib/jaspic/oauth-session-offline";
import type { OAuthOnceStore } from "../../lib/jaspic/oauth-once-offline";
const owner = "12345678-1234-1234-1234-123456789abc";
const state = "a".repeat(43);
const verifier = "b".repeat(64);
const key = Buffer.alloc(32, 5).toString("base64url");
const now = Date.now();
const callbackUrl = "https://emergencyalert.news/jaspic/oauth/callback?state=" + state + "&code=sample_code";
const clientId = "123.apps.googleusercontent.com";
describe("identity callback staging", () => {
  it("consumes owner-bound state once before preparing Google code exchange", async () => {
    const sealedCookie = await sealGmailWebSessionOffline(state, verifier, key, now, owner);
    const consumeAtomically = vi.fn(async () => "consumed" as const);
    const stateStore: OAuthOnceStore = { create: async () => {}, consumeAtomically };
    const result = await prepareJaspicIdentityCallback({
      callbackUrl, sealedCookie, cookieEncryptionKey: key, adminUserId: owner,
      stateStore, clientId, clientSecret: "test_secret", now: now + 1000,
    });
    expect(consumeAtomically).toHaveBeenCalledOnce();
    expect(result.url).toBe("https://oauth2.googleapis.com/token");
    expect(new URLSearchParams(result.body).get("code_verifier")).toBe(verifier);
  });
  it("rejects a different owner before consuming state", async () => {
    const sealedCookie = await sealGmailWebSessionOffline(state, verifier, key, now, owner);
    const consumeAtomically = vi.fn(async () => "consumed" as const);
    await expect(prepareJaspicIdentityCallback({
      callbackUrl, sealedCookie, cookieEncryptionKey: key,
      adminUserId: "00000000-0000-0000-0000-000000000000",
      stateStore: { create: async () => {}, consumeAtomically },
      clientId, clientSecret: "test_secret", now: now + 1000,
    })).rejects.toThrow();
    expect(consumeAtomically).not.toHaveBeenCalled();
  });
  it("fails closed on replay", async () => {
    const sealedCookie = await sealGmailWebSessionOffline(state, verifier, key, now, owner);
    await expect(prepareJaspicIdentityCallback({
      callbackUrl, sealedCookie, cookieEncryptionKey: key, adminUserId: owner,
      stateStore: { create: async () => {}, consumeAtomically: async () => "invalid_or_expired" },
      clientId, clientSecret: "test_secret", now: now + 1000,
    })).rejects.toThrow();
  });
});
