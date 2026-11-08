import "server-only";
import { createClient } from "@supabase/supabase-js";
import { prepareJaspicIdentityCallback } from "./oauth-identity-callback";
import { createSupabaseOAuthOnceStore, type JaspicOAuthDbClient } from "./oauth-supabase-store";
import { validateJaspicGmailSendTokenOffline } from "./oauth-gmail-send-token-validation-offline";

import { isJaspicAdmin } from "./admin-authorization";
import { saveEncryptedGmailRefreshToken } from "./oauth-gmail-token-store-server";
import { assertGmailVaultKey } from "./oauth-gmail-token-vault-offline";

export async function saveJaspicGmailSendConsent(requestUrl: string, sealedCookie: string): Promise<boolean> {
  if (process.env.JASPIC_GMAIL_SEND_CONSENT_ENABLED !== "true") { console.warn("[jaspic-gmail-oauth] disabled"); return false; }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.JASPIC_GOOGLE_WEB_CLIENT_ID;
  const clientSecret = process.env.JASPIC_GOOGLE_WEB_CLIENT_SECRET;
  const cookieKey = process.env.JASPIC_OAUTH_COOKIE_KEY;
  const encryptionKey = process.env.JASPIC_GMAIL_TOKEN_VAULT_KEY;
  const owner = process.env.JASPIC_ADMIN_USER_ID;
  const expectedEmail = process.env.JASPIC_OAUTH_ADMIN_EMAIL;
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) ||
      !service || !clientId || !clientSecret || !cookieKey || !owner || !expectedEmail || !encryptionKey) return false;
  try {
    assertGmailVaultKey(encryptionKey);
    stage = "oauth-state";
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const exchange = await prepareJaspicIdentityCallback({
      callbackUrl: requestUrl, sealedCookie, cookieEncryptionKey: cookieKey,
      adminUserId: owner, clientId, clientSecret, purpose: "gmail-send",
      stateStore: createSupabaseOAuthOnceStore(db as unknown as JaspicOAuthDbClient),
    });
    stage = "admin-check";
    const { data, error } = await db.auth.admin.getUserById(owner);
    const admin = data?.user;
    if (error || !admin || !isJaspicAdmin(admin, owner) || !admin.email_confirmed_at ||
        admin.email?.toLowerCase() !== expectedEmail.toLowerCase()) { console.warn("[jaspic-gmail-oauth] admin-check-failed"); return false; }
    stage = "token-exchange";
    const response = await fetch(exchange.url, {
      method: exchange.method, headers: exchange.headers, body: exchange.body,
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) { console.warn("[jaspic-gmail-oauth] token-exchange-failed"); return false; }
    const raw: unknown = await response.json();
    stage = "token-validation";
    const token = validateJaspicGmailSendTokenOffline(raw);
    stage = "userinfo";
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: "Bearer " + token.accessToken },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
    if (!profileResponse.ok) { console.warn("[jaspic-gmail-oauth] userinfo-failed"); return false; }
    const profile: unknown = await profileResponse.json();
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) { console.warn("[jaspic-gmail-oauth] userinfo-invalid"); return false; }
    const user = profile as Record<string, unknown>;
    if (user.email_verified !== true || typeof user.sub !== "string" ||
        !/^[0-9]{8,32}$/.test(user.sub) || typeof user.email !== "string" ||
        user.email.toLowerCase() !== expectedEmail.toLowerCase()) { console.warn("[jaspic-gmail-oauth] userinfo-mismatch"); return false; }
    stage = "vault-save";
    await saveEncryptedGmailRefreshToken({
      db, ownerId: admin.id, expectedAdminId: owner, googleSubject: user.sub,
      refreshToken: token.refreshToken, encryptionKey,
    });
    console.info("[jaspic-gmail-oauth] vault-save-succeeded");
    return true;
  } catch { console.warn("[jaspic-gmail-oauth] failed-at-" + stage); return false; }
}
