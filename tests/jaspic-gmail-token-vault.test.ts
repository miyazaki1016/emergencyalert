import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { sealRefreshTokenOffline, openRefreshTokenOffline } from "../lib/jaspic/oauth-gmail-token-vault-offline";

describe("Gmail refresh token encryption (offline)", () => {
  const key = randomBytes(32).toString("base64url");
  const token = "1//test-refresh-token-value-secret";
  it("round trips without plaintext in ciphertext", () => {
    const sealed = sealRefreshTokenOffline(token, key);
    expect(openRefreshTokenOffline(sealed, key)).toBe(token);
    expect(JSON.stringify(sealed)).not.toContain(token);
  });
  it("uses randomized nonces", () => {
    expect(sealRefreshTokenOffline(token, key).iv).not.toBe(sealRefreshTokenOffline(token, key).iv);
  });
  it("rejects tampering and wrong keys", () => {
    const sealed = sealRefreshTokenOffline(token, key);
    expect(() => openRefreshTokenOffline(sealed, randomBytes(32).toString("base64url"))).toThrow();
    expect(() => openRefreshTokenOffline({ ...sealed, tag: randomBytes(16).toString("base64url") }, key)).toThrow();
  });
  it("rejects malformed inputs", () => {
    expect(() => sealRefreshTokenOffline("short", key)).toThrow();
    expect(() => sealRefreshTokenOffline(token, "invalid")).toThrow();
  });
});
