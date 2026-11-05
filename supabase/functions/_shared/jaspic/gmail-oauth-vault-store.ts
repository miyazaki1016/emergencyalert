/**
 * REVIEW-ONLY token-vault adapter. No live DB calls unless a server-side
 * authorized caller explicitly injects a client after migration approval.
 * Never return plaintext refresh tokens to an HTTP response or logs.
 */
import type { EncryptedRefreshToken } from "./gmail-oauth-token-vault-offline.ts";

export type VaultRecord = {
  owner_id: string;
  key_id: string;
  encrypted_token: EncryptedRefreshToken;
  revoked_at: string | null;
};
export type VaultDbResult<T> = { data: T | null; error: { message: string } | null };
export interface JaspicVaultDbClient {
  from(table: "jaspic_gmail_oauth_vault"): {
    upsert(record: VaultRecord, options: {onConflict: "owner_id"}): PromiseLike<VaultDbResult<unknown>>;
    select(columns: "owner_id,key_id,encrypted_token,revoked_at"): {
      eq(column: "owner_id", value: string): {
        is(column: "revoked_at", value: null): {
          maybeSingle(): PromiseLike<VaultDbResult<VaultRecord>>;
        };
      };
    };
  };
}
function validOwner(ownerId: string) {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(ownerId)) throw new Error("JASPIC token vault unavailable");
}
function validEnvelope(value: EncryptedRefreshToken): boolean {
  return value?.version === 1 && /^[A-Za-z0-9_-]{4,64}$/.test(value.keyId) &&
    typeof value.iv === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(value.iv) &&
    typeof value.ciphertext === "string" && /^[A-Za-z0-9_-]{32,8192}$/.test(value.ciphertext);
}

/** Storage receives encrypted envelope only, never a raw Google token. */
export async function persistEncryptedRefreshToken(
  db: JaspicVaultDbClient,
  ownerId: string,
  encrypted: EncryptedRefreshToken,
): Promise<void> {
  validOwner(ownerId);
  if (!validEnvelope(encrypted)) throw new Error("JASPIC token vault unavailable");
  try {
    const {error} = await db.from("jaspic_gmail_oauth_vault").upsert({
      owner_id: ownerId,
      key_id: encrypted.keyId,
      encrypted_token: encrypted,
      revoked_at: null,
    }, {onConflict:"owner_id"});
    if (error) throw new Error();
  } catch {
    throw new Error("JASPIC token vault unavailable");
  }
}

/** Returns ciphertext envelope to server-side authorized code only. */
export async function fetchEncryptedRefreshToken(
  db: JaspicVaultDbClient,
  ownerId: string,
): Promise<EncryptedRefreshToken | null> {
  validOwner(ownerId);
  try {
    const {data,error} = await db.from("jaspic_gmail_oauth_vault")
      .select("owner_id,key_id,encrypted_token,revoked_at")
      .eq("owner_id",ownerId)
      .is("revoked_at",null)
      .maybeSingle();
    if (error) throw new Error();
    if (data === null) return null;
    if (data.owner_id !== ownerId || data.revoked_at !== null ||
        !validEnvelope(data.encrypted_token) || data.key_id !== data.encrypted_token.keyId) throw new Error();
    return data.encrypted_token;
  } catch {
    throw new Error("JASPIC token vault unavailable");
  }
}
