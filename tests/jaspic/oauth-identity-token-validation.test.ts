import { describe, expect, it } from "vitest";
import { validateJaspicIdentityTokenResponse } from "../../lib/jaspic/oauth-identity-token-validation";
const valid = { access_token: "abcdefghi0123456789", token_type: "Bearer", expires_in: 3600, scope: "openid email" };
describe("identity-only Google OAuth response", () => {
  it("accepts only openid/email and returns no refresh token", () => {
    expect(validateJaspicIdentityTokenResponse({ ...valid, refresh_token: "secret" })).toEqual({
      accessToken: valid.access_token, expiresInSeconds: 3600,
    });
  });
  it("rejects Gmail send and other mailbox scopes", () => {
    for (const scope of ["openid email https://www.googleapis.com/auth/gmail.send",
      "openid email https://www.googleapis.com/auth/gmail.readonly",
      "openid email https://mail.google.com/"]) {
      expect(() => validateJaspicIdentityTokenResponse({ ...valid, scope })).toThrow();
    }
  });
  it("rejects malformed responses, missing identity scopes and invalid expiry", () => {
    for (const candidate of [null, {}, { ...valid, scope: "email" },
      { ...valid, token_type: "Basic" }, { ...valid, expires_in: -1 },
      { ...valid, access_token: "bad" }]) {
      expect(() => validateJaspicIdentityTokenResponse(candidate)).toThrow();
    }
  });
});
