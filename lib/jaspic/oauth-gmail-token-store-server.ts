/** Server-only persistence adapter. Call only after verified admin + Google consent.
 * Never expose this module to client components or use a user JWT.
 * Does not refresh access tokens, send mail, or schedule jobs.
 */
import "server-only";
import { sealRefreshTokenOffline, type SealedRefreshToken } from "./oauth-gmail-token-vault-offline";

export type TokenVaultStore = {
  from(table: "jaspic_gmail_token_vault"): {
    upsert(row: Record<string, unknown>, options: { onConflict: "owner_id" }): PromiseLike<{ error: { message: string } | null }>;
  };
};

export async function saveEncryptedGmailRefreshToken(input: {
  db: TokenVaultStore;
  ownerId: string;
  expectedAdminId: string;
  googleSubject: string;
  refreshToken: string;
  encryptionKey: string;
}): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(input.ownerId) || input.ownerId !== input.expectedAdminId) throw new Error("Unauthorized token owner");
  if (!/^[0-9]{8,32}$/.test(input.googleSubject)) throw new Error("Invalid Google subject");
  const encrypted: SealedRefreshToken = sealRefreshTokenOffline(input.refreshToken, input.encryptionKey);
  const { error } = await input.db.from("jaspic_gmail_token_vault").upsert({
    owner_id: input.ownerId,
    provider: "google",
    scope: "https://www.googleapis.com/auth/gmail.send",
    google_subject: input.googleSubject,
    encrypted_refresh_token: encrypted,
    updated_at: new Date().toISOString(),
  }, { onConflict: "owner_id" });
  if (error) throw new Error("Unable to save encrypted Gmail credentials");
}
