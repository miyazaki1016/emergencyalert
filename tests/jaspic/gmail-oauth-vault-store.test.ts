import { describe, expect, it } from "vitest";
import {
  persistEncryptedRefreshToken, fetchEncryptedRefreshToken,
  type JaspicVaultDbClient, type VaultRecord,
} from "../../supabase/functions/_shared/jaspic/gmail-oauth-vault-store";
import { encryptGmailRefreshTokenOffline } from "../../supabase/functions/_shared/jaspic/gmail-oauth-token-vault-offline";

const owner = "example_owner_1234";

describe("encrypted Gmail token vault adapter (mock-only, no DB/network)", () => {
  it("writes only an encrypted envelope and reads it back", async () => {
    let row: VaultRecord | null = null;
    const db: JaspicVaultDbClient = {
      from() {
        return {
          upsert: async (value) => {
            row = value;
            return {data:null,error:null};
          },
          select: () => ({eq: () => ({is: () => ({
            maybeSingle: async () => ({data:row,error:null}),
          })})}),
        };
      },
    };
    const envelope = await encryptGmailRefreshTokenOffline(
      "mock-refresh-token-12345", owner, "a".repeat(43), "testkey_2026",
    );
    await persistEncryptedRefreshToken(db, owner, envelope);
    expect(JSON.stringify(row)).not.toContain("mock-refresh-token-12345");
    expect(await fetchEncryptedRefreshToken(db, owner)).toEqual(envelope);
  });

  it("fails closed on database errors and rejects raw tokens", async () => {
    const db: JaspicVaultDbClient = {
      from() {
        return {
          upsert: async () => ({data:null,error:{message:"private-error"}}),
          select: () => ({eq: () => ({is: () => ({
            maybeSingle: async () => ({data:null,error:{message:"private-error"}}),
          })})}),
        };
      },
    };
    await expect(persistEncryptedRefreshToken(db,owner,{
      version:1,keyId:"testkey_2026",iv:"x".repeat(16),ciphertext:"y".repeat(32),
    })).rejects.toThrow("JASPIC token vault unavailable");
    await expect(fetchEncryptedRefreshToken(db,owner)).rejects.toThrow("JASPIC token vault unavailable");
  });
});
