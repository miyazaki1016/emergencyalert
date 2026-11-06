import { describe, expect, it } from "vitest";
import { JASPIC_GOOGLE_CALLBACK, prepareJaspicIdentityConsent } from "../../lib/jaspic/oauth-consent-preparation";

describe("JASPIC identity-only OAuth consent preparation", () => {
  it("rejects invalid OAuth client IDs", async () => {
    await expect(prepareJaspicIdentityConsent("invalid")).rejects.toThrow();
  });
  it("generates unique state, PKCE S256, and no Gmail send scope", async () => {
    const id = "1234-abc.apps.googleusercontent.com";
    const first = await prepareJaspicIdentityConsent(id);
    const second = await prepareJaspicIdentityConsent(id);
    expect(first.state).not.toBe(second.state);
    expect(first.codeVerifier).not.toBe(second.codeVerifier);
    const url = new URL(first.authorizationUrl);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("redirect_uri")).toBe(JASPIC_GOOGLE_CALLBACK);
    expect(url.searchParams.get("scope")).toBe("openid email");
    expect(url.searchParams.get("scope")).not.toContain("gmail.send");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(url.searchParams.get("state")).toBe(first.state);
    expect(first.authorizationUrl).not.toContain(first.codeVerifier);
  });
});
