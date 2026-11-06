import { describe, expect, it } from "vitest";
import { validateJaspicGmailSendTokenOffline } from "../lib/jaspic/oauth-gmail-send-token-validation-offline";
import { JASPIC_GMAIL_SEND_SCOPE } from "../lib/jaspic/oauth-gmail-send-consent-offline";

const valid = {
  access_token: "access-token-synthetic",
  refresh_token: "refresh-token-synthetic",
  token_type: "Bearer",
  expires_in: 3600,
  scope: "openid email " + JASPIC_GMAIL_SEND_SCOPE,
};

describe("JASPIC Gmail send grant validation (offline)", () => {
  it("accepts only send-only consent with a refresh token", () => {
    expect(validateJaspicGmailSendTokenOffline(valid).expiresInSeconds).toBe(3600);
  });
  it("rejects missing send permission", () => {
    expect(() => validateJaspicGmailSendTokenOffline({ ...valid, scope: "openid email" })).toThrow();
  });
  it("rejects Gmail full-access or read permissions", () => {
    for (const extra of ["https://mail.google.com/", "https://www.googleapis.com/auth/gmail.readonly"]) {
      expect(() => validateJaspicGmailSendTokenOffline({ ...valid, scope: valid.scope + " " + extra })).toThrow();
    }
  });
  it("rejects missing refresh token, missing scopes and malformed expiry", () => {
    expect(() => validateJaspicGmailSendTokenOffline({ ...valid, refresh_token: undefined })).toThrow();
    expect(() => validateJaspicGmailSendTokenOffline({ ...valid, scope: undefined })).toThrow();
    expect(() => validateJaspicGmailSendTokenOffline({ ...valid, expires_in: 0 })).toThrow();
  });
});
