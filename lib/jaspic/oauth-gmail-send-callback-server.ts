/**
 * Gmail consent dry-run callback. No token persistence or mail delivery.
 * Caller must provide the owner-bound HttpOnly session cookie.
 */
import { createClient } from "@supabase/supabase-js";
import { prepareJaspicIdentityCallback } from "./oauth-identity-callback";
import { createSupabaseOAuthOnceStore, type JaspicOAuthDbClient } from "./oauth-supabase-store";
import { validateJaspicGmailSendTokenOffline } from "./oauth-gmail-send-token-validation-offline";

export async function verifyJaspicGmailSendConsent(requestUrl: string, sealedCookie: string): Promise<boolean> {
  if (process.env.JASPIC_GMAIL_SEND_CONSENT_ENABLED !== "true") return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.JASPIC_GOOGLE_WEB_CLIENT_ID;
  const clientSecret = process.env.JASPIC_GOOGLE_WEB_CLIENT_SECRET;
  const cookieKey = process.env.JASPIC_OAUTH_COOKIE_KEY;
  const owner = process.env.JASPIC_ADMIN_USER_ID;
  const expectedEmail = process.env.JASPIC_OAUTH_ADMIN_EMAIL;
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) ||
      !service || !clientId || !clientSecret || !cookieKey || !owner || !expectedEmail) return false;
  try {
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const exchange = await prepareJaspicIdentityCallback({
      callbackUrl: requestUrl, sealedCookie, cookieEncryptionKey: cookieKey,
      adminUserId: owner, clientId, clientSecret,
      stateStore: createSupabaseOAuthOnceStore(db as unknown as JaspicOAuthDbClient),
    });
    const response = await fetch(exchange.url, {
      method: exchange.method, headers: exchange.headers, body: exchange.body,
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return false;
    const raw: unknown = await response.json();
    const token = validateJaspicGmailSendTokenOffline(raw);
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: "Bearer " + token.accessToken },
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!profileResponse.ok) return false;
    const profile: unknown = await profileResponse.json();
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) return false;
    const user = profile as Record<string, unknown>;
    return user.email_verified === true && typeof user.sub === "string" &&
      /^[0-9]{8,32}$/.test(user.sub) && typeof user.email === "string" &&
      user.email.toLowerCase() === expectedEmail.toLowerCase();
    // Both access and refresh tokens are discarded here; no durable authorization.
  } catch { return false; }
}
