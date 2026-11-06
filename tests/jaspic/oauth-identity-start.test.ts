import { describe, expect, it, vi } from "vitest";
import { prepareJaspicAdminIdentityStart } from "../../lib/jaspic/oauth-identity-start";
import type { OAuthOnceStore } from "../../lib/jaspic/oauth-once-offline";
const owner = "12345678-1234-1234-1234-123456789abc";
const key = Buffer.alloc(32, 5).toString("base64url");
function store(): { stateStore: OAuthOnceStore; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => {});
  return { create, stateStore: { create, consumeAtomically: async () => "invalid_or_expired" } };
}
describe("admin-bound identity OAuth start staging", () => {
  it("registers state before releasing identity-only consent URL", async () => {
    const { stateStore, create } = store();
    const r = await prepareJaspicAdminIdentityStart({
      verifiedOwnerId: owner, adminUserId: owner,
      clientId: "123.apps.googleusercontent.com", cookieEncryptionKey: key, stateStore,
    });
    expect(create).toHaveBeenCalledOnce();
    expect(r.authorizationUrl).toContain("accounts.google.com");
    expect(new URL(r.authorizationUrl).searchParams.get("scope")).toBe("openid email");
    expect(r.sealedCookie).toMatch(/^v1\./);
    expect(r.cookiePolicy.httpOnly).toBe(true);
  });
  it("refuses unauthorized owners and DB failures", async () => {
    const { stateStore, create } = store();
    await expect(prepareJaspicAdminIdentityStart({
      verifiedOwnerId: owner, adminUserId: "00000000-0000-0000-0000-000000000000",
      clientId: "123.apps.googleusercontent.com", cookieEncryptionKey: key, stateStore,
    })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
    await expect(prepareJaspicAdminIdentityStart({
      verifiedOwnerId: owner, adminUserId: owner,
      clientId: "123.apps.googleusercontent.com", cookieEncryptionKey: key,
      stateStore: { ...stateStore, create: async () => { throw new Error("DB down"); } },
    })).rejects.toThrow();
  });
});
