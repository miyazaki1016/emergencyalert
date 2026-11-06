import { describe, expect, it } from "vitest";
import { isJaspicAdmin } from "../../lib/jaspic/admin-authorization";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
describe("JASPIC admin authorization (deny by default)", () => {
  it("denies missing config and missing user", () => {
    expect(isJaspicAdmin(null, id)).toBe(false);
    expect(isJaspicAdmin({ id, app_metadata: { jaspic_role: "admin" } }, undefined)).toBe(false);
  });
  it("denies email-only and non-admin users", () => {
    expect(isJaspicAdmin({ id, app_metadata: {} }, id)).toBe(false);
    expect(isJaspicAdmin({ id: "11111111-1111-1111-1111-111111111111", app_metadata: { jaspic_role: "admin" } }, id)).toBe(false);
  });
  it("rejects malformed admin configuration and spoofed user metadata", () => {
    expect(isJaspicAdmin({ id, app_metadata: { jaspic_role: "admin" } }, "not-a-uuid")).toBe(false);
    expect(isJaspicAdmin({ id, app_metadata: { jaspic_role: "user" } }, id)).toBe(false);
    expect(isJaspicAdmin({ id, user_metadata: { jaspic_role: "admin" } } as unknown as { id: string; app_metadata: Record<string, unknown> }, id)).toBe(false);
  });
  it("permits only matching ID with server-controlled app metadata", () => {
    expect(isJaspicAdmin({ id, app_metadata: { jaspic_role: "admin" } }, id)).toBe(true);
  });
});
