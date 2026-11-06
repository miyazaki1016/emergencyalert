/** Only use a service-role client after authenticating the configured administrator. */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { JASPIC_GMAIL_SEND_SCOPE } from "./oauth-gmail-send-consent-offline";
import { openRefreshTokenOffline, sealRefreshTokenOffline } from "./oauth-gmail-token-vault-offline";

const TABLE = "jaspic_gmail_token_vault";
type VaultAccess = {
  db: Pick<SupabaseClient, "from">;
  ownerId: string;
  expectedAdminId: string;
};

function authorizeOwner({ ownerId, expectedAdminId }: VaultAccess): void {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ownerId) || ownerId !== expectedAdminId) {
    throw new Error("Unauthorized token owner");
  }
}

export async function saveEncryptedGmailRefreshToken(input: VaultAccess & {
  googleSubject: string;
  refreshToken: string;
  encryptionKey: string;
}): Promise<void> {
  authorizeOwner(input);
  if (!/^[0-9]{8,32}$/.test(input.googleSubject)) throw new Error("Invalid Google subject");
  const encrypted = sealRefreshTokenOffline(input.refreshToken, input.encryptionKey, [input.ownerId, input.googleSubject]);
  const { error } = await input.db.from(TABLE).upsert({
    owner_id: input.ownerId,
    provider: "google",
    scope: JASPIC_GMAIL_SEND_SCOPE,
    google_subject: input.googleSubject,
    encrypted_refresh_token: encrypted,
    updated_at: new Date().toISOString(),
  }, { onConflict: "owner_id" });
  if (error) throw new Error("Unable to save encrypted Gmail credentials");
}

export async function readEncryptedGmailRefreshToken(input: VaultAccess & {
  encryptionKey: string;
}): Promise<string | null> {
  authorizeOwner(input);
  const { data, error } = await input.db.from(TABLE)
    .select("google_subject, encrypted_refresh_token").eq("owner_id", input.ownerId).maybeSingle();
  if (error) throw new Error("Unable to read encrypted Gmail credentials");
  if (!data) return null;
  return openRefreshTokenOffline(data.encrypted_refresh_token, input.encryptionKey, [input.ownerId, data.google_subject]);
}

/** Remove local authorization after disconnect or provider-side revocation. */
export async function deleteEncryptedGmailRefreshToken(input: VaultAccess): Promise<void> {
  authorizeOwner(input);
  const { error } = await input.db.from(TABLE).delete().eq("owner_id", input.ownerId);
  if (error) throw new Error("Unable to remove encrypted Gmail credentials");
}
