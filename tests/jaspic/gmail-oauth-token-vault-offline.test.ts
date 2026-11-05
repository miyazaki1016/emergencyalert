import { describe, expect, it } from "vitest";
import {
  encryptGmailRefreshTokenOffline, decryptGmailRefreshTokenOffline,
} from "../../supabase/functions/_shared/jaspic/gmail-oauth-token-vault-offline";

describe("JASPIC encrypted refresh-token envelope (offline)", () => {
  const owner = "synthetic_owner_123";
  const rawKey = "a".repeat(43);
  const token = "synthetic-refresh-value-1234";
  const keyId = "key_2026_11";

  it("encrypts for a specific owner and decrypts only using the correct owner and key", async () => {
    const envelope = await encryptGmailRefreshTokenOffline(token, owner, rawKey, keyId);
    expect(envelope.version).toBe(1);
    expect(envelope.keyId).toBe(keyId);
    expect(envelope.ciphertext).not.toContain(token);
    expect(await decryptGmailRefreshTokenOffline(envelope, owner, rawKey, keyId)).toBe(token);
    await expect(decryptGmailRefreshTokenOffline(envelope,"another_owner_123",rawKey,keyId))
      .rejects.toThrow("Invalid encrypted refresh token");
    await expect(decryptGmailRefreshTokenOffline(envelope,owner,"b".repeat(43),keyId))
      .rejects.toThrow("Invalid encrypted refresh token");
  });

  it("rejects tampered envelopes and invalid encryption key identifiers", async () => {
    const envelope = await encryptGmailRefreshTokenOffline(token, owner, rawKey, keyId);
    await expect(decryptGmailRefreshTokenOffline({...envelope,ciphertext:"changed"},owner,rawKey,keyId))
      .rejects.toThrow("Invalid encrypted refresh token");
    await expect(decryptGmailRefreshTokenOffline(envelope,owner,rawKey,"wrong_id"))
      .rejects.toThrow("Invalid encrypted refresh token");
  });
});
