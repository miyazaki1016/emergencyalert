import { describe, expect, it } from "vitest";
import { authorizeJaspicOAuthStart } from "../../lib/jaspic/oauth-start-authorization";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const admin = { id, app_metadata: { jaspic_role: "admin" } };

describe("isolated JASPIC Gmail OAuth start authorization", () => {
  it("denies by default, including missing or malformed flags", () => {
    for (const flag of [undefined, "", "false", "TRUE", "1"]) {
      expect(authorizeJaspicOAuthStart(admin, id, flag)).toBeNull();
    }
  });
  it("denies missing identity, mismatched ID, and missing role even when enabled", () => {
    expect(authorizeJaspicOAuthStart(null, id, "true")).toBeNull();
    expect(authorizeJaspicOAuthStart(admin, undefined, "true")).toBeNull();
    expect(authorizeJaspicOAuthStart(admin, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "true")).toBeNull();
    expect(authorizeJaspicOAuthStart({ id, app_metadata: {} }, id, "true")).toBeNull();
    expect(authorizeJaspicOAuthStart({ id, app_metadata: { jaspic_role: "user" } }, id, "true")).toBeNull();
  });
  it("does not accept a user_metadata role in place of app_metadata", () => {
    const spoofed = { id, user_metadata: { jaspic_role: "admin" } };
    expect(authorizeJaspicOAuthStart(spoofed, id, "true")).toBeNull();
  });
  it("allows only matching verified admin identity with explicit enable flag", () => {
    expect(authorizeJaspicOAuthStart(admin, id, "true")).toEqual({ ownerId: id });
  });
});
