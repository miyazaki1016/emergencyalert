import { describe, expect, it } from "vitest";
import { verifyGmailWebCallbackOffline } from "../../supabase/functions/_shared/jaspic/gmail-web-callback-offline";
import { hashGmailOAuthStateOffline, type OAuthOnceStore } from "../../supabase/functions/_shared/jaspic/gmail-oauth-once-offline";
import { sealGmailWebSessionOffline } from "../../supabase/functions/_shared/jaspic/gmail-web-session-offline";

describe("offline owner-gated one-time callback orchestration", () => {
  const owner = "owner_subject_1234";
  const email = "owner@example.invalid";
  const issuer = "https://auth.example.invalid";
  const state = "s".repeat(43);
  const verifier = "v".repeat(64);
  const key = "a".repeat(43);
  const now = 1_800_000_000_000;

  function store(): OAuthOnceStore {
    const records = new Map<string, {ownerId: string; expiresAt: number}>();
    return {
      async create(input) { if (records.has(input.stateHash)) throw new Error("Duplicate state"); records.set(input.stateHash, input); },
      async consumeAtomically({stateHash,ownerId,now:clock}) {
        const row = records.get(stateHash);
        if (!row || row.ownerId !== ownerId || row.expiresAt <= clock) return "invalid_or_expired";
        records.delete(stateHash);
        return "consumed";
      },
    };
  }

  async function fixture() {
    const db = store();
    await db.create({stateHash: await hashGmailOAuthStateOffline(state), ownerId: owner, expiresAt: now + 300000});
    const encryptedCookie = await sealGmailWebSessionOffline(state, verifier, key, now);
    return {
      callbackUrl: "https://emergencyalert.news/jaspic/oauth/callback?code=synthetic&state=" + state,
      encryptedCookie, cookieEncryptionKey: key,
      identity: {subject: owner, verifiedEmail: email, issuer, sessionVerified: true as const},
      adminPolicy: {expectedSubject: owner, expectedEmail: email, expectedIssuer: issuer},
      store: db, now: now + 1000,
    };
  }

  it("returns server-only code and verifier once, then denies replay", async () => {
    const f = await fixture();
    expect(await verifyGmailWebCallbackOffline(f)).toEqual({
      authorizationCode: "synthetic", codeVerifier: verifier, ownerId: owner,
    });
    await expect(verifyGmailWebCallbackOffline(f)).rejects.toThrow("OAuth callback rejected");
  });

  it("denies mismatched owner and mismatched callback CSRF", async () => {
    const f = await fixture();
    await expect(verifyGmailWebCallbackOffline({...f, identity: {
      ...f.identity, subject: "wrong_subject_1234",
    }})).rejects.toThrow("JASPIC admin access denied");
    await expect(verifyGmailWebCallbackOffline({...f,
      callbackUrl: f.callbackUrl.replace(state, "x".repeat(43)),
    })).rejects.toThrow("Invalid OAuth session");
  });
});
