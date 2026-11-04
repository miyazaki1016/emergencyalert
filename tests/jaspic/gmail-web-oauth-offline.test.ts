import { describe, expect, it } from "vitest";
import { prepareGmailWebConsentOffline, validateGmailWebCallbackOffline, JASPIC_GOOGLE_CALLBACK } from "../../supabase/functions/_shared/jaspic/gmail-web-oauth-offline";

describe("iPhone-compatible Gmail web OAuth PKCE, offline only", () => {
  const clientId = "synthetic-web-client.apps.googleusercontent.com";
  it("generates single-account consent URL, S256 PKCE and distinct CSRF state", async () => {
    const first = await prepareGmailWebConsentOffline(clientId);
    const next = await prepareGmailWebConsentOffline(clientId);
    const u = new URL(first.authorizationUrl);
    expect(u.origin).toBe("https://accounts.google.com");
    expect(u.searchParams.get("client_id")).toBe(clientId);
    expect(u.searchParams.get("redirect_uri")).toBe(JASPIC_GOOGLE_CALLBACK);
    expect(u.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/gmail.send");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("prompt")).toBe("consent");
    expect(first.codeVerifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(first.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(next.state).not.toBe(first.state);
    expect(next.codeVerifier).not.toBe(first.codeVerifier);
    expect(first.authorizationUrl).not.toContain(first.codeVerifier);
  });
  it("validates the exact callback and rejects spoofing / multiple state parameters", async () => {
    const {state} = await prepareGmailWebConsentOffline(clientId);
    expect(validateGmailWebCallbackOffline(`${JASPIC_GOOGLE_CALLBACK}?state=${state}&code=4%2F0Synthetic`, state))
      .toEqual({ code: "4/0Synthetic" });
    for (const url of [
      `https://evil.example/jaspic/oauth/callback?state=${state}&code=4%2F0Synthetic`,
      `${JASPIC_GOOGLE_CALLBACK}?state=${state}&state=${state}&code=4%2F0Synthetic`,
      `${JASPIC_GOOGLE_CALLBACK}?state=wrong&code=4%2F0Synthetic`,
      `${JASPIC_GOOGLE_CALLBACK}?state=${state}&error=access_denied&code=4%2F0Synthetic`,
      `${JASPIC_GOOGLE_CALLBACK}?state=${state}&code=4%2F0Synthetic#fragment`,
      `${JASPIC_GOOGLE_CALLBACK}?state=${state}&code=x%0AInjected`,
    ]) expect(() => validateGmailWebCallbackOffline(url,state)).toThrow();
  });
  it("rejects malformed or desktop OAuth IDs", async () => {
    await expect(prepareGmailWebConsentOffline("not-an-oauth-client")).rejects.toThrow();
  });
});
