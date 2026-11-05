import { describe, expect, it } from "vitest";
import { GOOGLE_USERINFO_ENDPOINT, validateGoogleSenderIdentityOffline } from "../../supabase/functions/_shared/jaspic/gmail-google-sender-identity-offline";

describe("Google sender identity is checked before token persistence (offline only)", () => {
  const expected = "owner@example.com";
  const valid = { sub: "123456789012345", email: "owner@example.com", email_verified: true };
  it("accepts only Google's verified matching email and stable subject", () => {
    expect(GOOGLE_USERINFO_ENDPOINT).toBe("https://openidconnect.googleapis.com/v1/userinfo");
    expect(validateGoogleSenderIdentityOffline(valid, expected)).toEqual({
      googleSubject: valid.sub, verifiedEmail: expected,
    });
    expect(validateGoogleSenderIdentityOffline({ ...valid, email: "OWNER@EXAMPLE.COM" }, expected).googleSubject).toBe(valid.sub);
  });
  it("rejects a different Google account, unverified email and malformed responses", () => {
    for (const response of [
      null, [], {}, { ...valid, email: "attacker@example.com" },
      { ...valid, email_verified: false }, { ...valid, email_verified: "true" },
      { ...valid, sub: null }, { ...valid, sub: "" }, { ...valid, sub: "spoofed" },
      { ...valid, email: "owner@example.com " },
    ]) {
      expect(() => validateGoogleSenderIdentityOffline(response, expected)).toThrow();
    }
    expect(() => validateGoogleSenderIdentityOffline(valid, "bad-email")).toThrow();
  });
});
