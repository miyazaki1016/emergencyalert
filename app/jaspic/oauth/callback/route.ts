import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { openGmailWebSessionOffline, GMAIL_OAUTH_COOKIE_POLICY } from "../../../../supabase/functions/_shared/jaspic/gmail-web-session-offline";
import { validateGmailWebCallbackOffline } from "../../../../supabase/functions/_shared/jaspic/gmail-web-oauth-offline";
import { consumeOAuthStateOffline } from "../../../../supabase/functions/_shared/jaspic/gmail-oauth-once-offline";
import { createSupabaseOAuthOnceStore, type JaspicOAuthDbClient } from "../../../../supabase/functions/_shared/jaspic/gmail-oauth-supabase-store";
import { prepareWebOAuthExchangeOffline, validateWebOAuthTokenOffline } from "../../../../supabase/functions/_shared/jaspic/gmail-web-exchange-offline";
import { encryptGmailRefreshTokenOffline } from "../../../../supabase/functions/_shared/jaspic/gmail-oauth-token-vault-offline";
import { persistEncryptedRefreshToken, type JaspicVaultDbClient } from "../../../../supabase/functions/_shared/jaspic/gmail-oauth-vault-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };

function resultPage(status: 200 | 503, success: boolean) {
  const response = NextResponse.json({
    status: success ? "authorized" : "disabled",
    message: success ? "JASPIC Gmail authorization stored. Mail sending remains disabled." : "JASPIC authentication is not ready.",
  }, { status, headers });
  response.cookies.delete(GMAIL_OAUTH_COOKIE_POLICY.name);
  return response;
}

/**
 * Feature-gated owner-bound OAuth callback.
 * No Gmail API / send, SMTP, scheduler, or automatic mail transport.
 * The start route must authenticate admin, register one-use state, and
 * encrypt the verified owner in the Secure HttpOnly cookie.
 */
export async function GET(request: NextRequest) {
  if (process.env.JASPIC_OAUTH_CALLBACK_ENABLED !== "true") return resultPage(503, false);
  const cookie = request.cookies.get(GMAIL_OAUTH_COOKIE_POLICY.name)?.value;
  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.JASPIC_GOOGLE_WEB_CLIENT_ID;
  const clientSecret = process.env.JASPIC_GOOGLE_WEB_CLIENT_SECRET;
  const cookieKey = process.env.JASPIC_OAUTH_COOKIE_KEY;
  const vaultKey = process.env.JASPIC_OAUTH_TOKEN_KEY;
  const vaultKeyId = process.env.JASPIC_OAUTH_TOKEN_KEY_ID;
  const adminSubject = process.env.JASPIC_OAUTH_ADMIN_SUBJECT;
  if (!cookie || !state || params.getAll("state").length !== 1 || params.getAll("code").length !== 1 ||
      !url || !serviceKey || !clientId || !clientSecret || !cookieKey || !vaultKey || !vaultKeyId ||
      !adminSubject || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    return resultPage(503, false);
  }
  try {
    const session = await openGmailWebSessionOffline(cookie, state, cookieKey);
    if (!session.ownerId || session.ownerId !== adminSubject) throw new Error("Unauthorized owner");
    const callback = validateGmailWebCallbackOffline(request.url, state);
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const oneUse = createSupabaseOAuthOnceStore(db as unknown as JaspicOAuthDbClient);
    // Consume CSRF state atomically BEFORE exchanging the one-time Google code.
    if (!await consumeOAuthStateOffline(oneUse, state, session.ownerId)) throw new Error("Replay");
    const descriptor = prepareWebOAuthExchangeOffline({
      clientId, clientSecret, code: callback.code, codeVerifier: session.codeVerifier,
    });
    const exchange = await fetch(descriptor.url, {
      method: descriptor.method,
      headers: descriptor.headers,
      body: descriptor.body,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!exchange.ok) throw new Error("OAuth exchange failed");
    const body: unknown = await exchange.json();
    const token = validateWebOAuthTokenOffline(body);
    const encrypted = await encryptGmailRefreshTokenOffline(
      token.refreshToken, session.ownerId, vaultKey, vaultKeyId,
    );
    await persistEncryptedRefreshToken(db as unknown as JaspicVaultDbClient, session.ownerId, encrypted);
    return resultPage(200, true);
  } catch {
    // Never expose/log the authorization code, tokens or secret-bearing URL.
    return resultPage(503, false);
  }
}
