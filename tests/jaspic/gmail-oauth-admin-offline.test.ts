import { describe, expect, it } from "vitest";
import {
  authorizeJaspicAdminOffline, type TrustedServerIdentity,
} from "../../supabase/functions/_shared/jaspic/gmail-oauth-admin-offline";

const config = {
  expectedSubject: "owner_subject_1234",
  expectedEmail: "owner@example.invalid",
  expectedIssuer: "https://auth.example.invalid",
};
const identity: TrustedServerIdentity = {
  subject: config.expectedSubject,
  verifiedEmail: config.expectedEmail,
  issuer: config.expectedIssuer,
  sessionVerified: true,
};

describe("offline JASPIC Gmail admin access policy", () => {
  it("grants only the explicitly configured owner after trusted verification", () => {
    expect(authorizeJaspicAdminOffline(identity, config)).toEqual({
      ownerId: "owner_subject_1234",
    });
  });

  it("denies missing, mismatched or unverified identities", () => {
    const candidates = [
      null,
      {...identity, subject: "different_subject_1234"},
      {...identity, verifiedEmail: "attacker@example.invalid"},
      {...identity, issuer: "https://other.example.invalid"},
      {...identity, sessionVerified: false},
      {...identity, subject: ""},
    ];
    for (const candidate of candidates) {
      expect(() => authorizeJaspicAdminOffline(
        candidate as TrustedServerIdentity | null, config,
      )).toThrow("JASPIC admin access denied");
    }
  });

  it("fails closed if configured owner fields are incomplete", () => {
    expect(() => authorizeJaspicAdminOffline(identity, {
      ...config, expectedSubject: "",
    })).toThrow("JASPIC admin access denied");
  });
});
