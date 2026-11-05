import { describe, expect, it } from "vitest";
import { prepareWebOAuthExchangeOffline, validateWebOAuthTokenOffline } from "../../supabase/functions/_shared/jaspic/gmail-web-exchange-offline";

describe("offline OAuth exchange preparation", () => {
  it("builds a form-encoded request descriptor without a network call", () => {
    const r = prepareWebOAuthExchangeOffline({
      clientId: "example.apps.googleusercontent.com",
      clientSecret: "example",
      code: "example",
      codeVerifier: "x".repeat(64),
    });
    expect(r.method).toBe("POST");
    const fields = new URLSearchParams(r.body);
    expect(fields.get("grant_type")).toBe("authorization_code");
    expect(fields.get("redirect_uri")).toBe("https://emergencyalert.news/jaspic/oauth/callback");
  });
  it("rejects malformed input and incomplete responses", () => {
    expect(() => prepareWebOAuthExchangeOffline({
      clientId: "invalid", clientSecret: "example", code: "example", codeVerifier: "x".repeat(64),
    })).toThrow();
    expect(() => validateWebOAuthTokenOffline({})).toThrow();
    const token = {
      access_token: "synthetic-access", refresh_token: "synthetic-refresh",
      expires_in: 3600, token_type: "Bearer",
      scope: "openid email https://www.googleapis.com/auth/gmail.send",
    };
    expect(validateWebOAuthTokenOffline(token).refreshToken).toBe("synthetic-refresh");
    expect(() => validateWebOAuthTokenOffline({ ...token, scope: "https://www.googleapis.com/auth/gmail.send" })).toThrow();
    expect(() => validateWebOAuthTokenOffline({ ...token, scope: "openid email" })).toThrow();
  });
});
