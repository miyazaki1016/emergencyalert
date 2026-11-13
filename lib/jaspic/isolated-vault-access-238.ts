/** Issue #238 only: obtain an ephemeral Gmail access token through the existing
 * administrator-owned encrypted OAuth vault. Never persist or log tokens. */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readEncryptedGmailRefreshToken } from "./oauth-gmail-token-store-server";
import { refreshIsolatedGmailAccessToken } from "./isolated-oauth-refresh-238";

export async function getIsolatedGmailAccessToken(
  authenticatedAdminId: string,
  request: typeof fetch,
): Promise<string> {
  if (process.env.VERCEL_ENV !== "preview" ||
      process.env.VERCEL_GIT_COMMIT_REF !== "test/jaspic-238-isolated-bulk")
    throw new Error("ISOLATED_PREVIEW_ONLY");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerId = process.env.JASPIC_ADMIN_USER_ID;
  const vaultKey = process.env.JASPIC_GMAIL_TOKEN_VAULT_KEY;
  const clientId = process.env.JASPIC_GOOGLE_WEB_CLIENT_ID;
  const clientSecret = process.env.JASPIC_GOOGLE_WEB_CLIENT_SECRET;
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) ||
      !serviceKey || !ownerId || !vaultKey || !clientId || !clientSecret ||
      authenticatedAdminId !== ownerId)
    throw new Error("ISOLATED_OAUTH_NOT_CONFIGURED");
  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const refreshToken = await readEncryptedGmailRefreshToken({
    db, ownerId: authenticatedAdminId, expectedAdminId: ownerId, encryptionKey: vaultKey,
  });
  if (!refreshToken) throw new Error("ISOLATED_GMAIL_NOT_CONNECTED");
  return refreshIsolatedGmailAccessToken({clientId, clientSecret, refreshToken}, request);
}
