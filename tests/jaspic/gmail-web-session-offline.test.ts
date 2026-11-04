import { describe, expect, it } from "vitest";
import {
  GMAIL_OAUTH_COOKIE_POLICY,
  openGmailWebSessionOffline,
  sealGmailWebSessionOffline,
} from "../../supabase/functions/_shared/jaspic/gmail-web-session-offline";

describe("offline iPhone OAuth cookie session", () => {
  const key = "a".repeat(43);
  const state = "b".repeat(43);
  const verifier = "c".repeat(64);
  const now = 1_800_000_000_000;

  it("round trips encrypted state/verifier without putting them in plaintext cookies", async () => {
    const cookie = await sealGmailWebSessionOffline(state, verifier, key, now);
    expect(cookie).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(cookie).not.toContain(state);
    expect(cookie).not.toContain(verifier);
    const result = await openGmailWebSessionOffline(cookie, state, key, now + 10_000);
    expect(result).toEqual({ state, codeVerifier: verifier, issuedAt: now, expiresAt: now + 300_000 });
  });

  it("rejects a changed state, tampering, expiry and a wrong key", async () => {
    const cookie = await sealGmailWebSessionOffline(state, verifier, key, now);
    await expect(openGmailWebSessionOffline(cookie, "d".repeat(43), key, now + 20)).rejects.toThrow("Invalid OAuth session");
    await expect(openGmailWebSessionOffline(cookie.slice(0, -1) + "x", state, key, now + 20)).rejects.toThrow("Invalid OAuth session");
    await expect(openGmailWebSessionOffline(cookie, state, key, now + 300_001)).rejects.toThrow("Invalid OAuth session");
    await expect(openGmailWebSessionOffline(cookie, state, "e".repeat(43), now + 20)).rejects.toThrow("Invalid OAuth session");
  });

  it("requires a secure HttpOnly host-only cookie policy", () => {
    expect(GMAIL_OAUTH_COOKIE_POLICY).toMatchObject({
      name: "__Host-jaspic-oauth", path: "/", httpOnly: true,
      secure: true, sameSite: "lax", maxAge: 300,
    });
  });
});
