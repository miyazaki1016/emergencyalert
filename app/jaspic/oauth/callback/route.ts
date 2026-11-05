import { createClient } from "@supabase/supabase-js";
import { GOOGLE_USERINFO_ENDPOINT, validateGoogleSenderIdentityOffline } from "../../../../supabase/functions/_shared/jaspic/gmail-google-sender-identity-offline";
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

function resultPage(success: boolean) {
  // Redirect strips the authorization code and CSRF state from the browser URL.
  const response = NextResponse.redirect(
    "https://emergencyalert.news/jaspic/oauth/result?status=" + (success ? "ok" : "unavailable"),
    { status: 303, headers },
  );
  response.cookies.set(GMAIL_OAUTH_COOKIE_POLICY.name, "", {
    path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 0,
  });
  return response;
}

/**
 * Feature-gated owner-bound OAuth callback.
 * No Gmail API / send, SMTP, scheduler, or automatic mail transport.
 * The start route must authenticate admin, register one-use state, and
 * encrypt the verified owner in the Secure HttpOnly cookie.
 */
export async function GET(request: NextRequest) {
  if (process.env.JASPIC_OAUTH_CALLBACK_ENABLED !== "true") return resultPage(false);
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
  const expectedGoogleEmail = process.env.JASPIC_OAUTH_ADMIN_EMAIL;
  if (!cookie || !state || params.getAll("state").length !== 1 || params.getAll("code").length !== 1 ||
      !url || !serviceKey || !clientId || !clientSecret || !cookieKey || !vaultKey || !vaultKeyId ||
      !adminSubject || !expectedGoogleEmail || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    return resultPage(false);
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
    // Never store a refresh token granted by a different Google account.
    // OIDC userinfo uses the authorization-code exchange access token and
    // requires only the additional openid/email identity scopes.
    const identityResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: { Authorization: "Bearer " + token.accessToken },
      method: "GET", cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!identityResponse.ok) throw new Error("Google identity verification failed");
    validateGoogleSenderIdentityOffline(await identityResponse.json(), expectedGoogleEmail);
    const encrypted = await encryptGmailRefreshTokenOffline(
      token.refreshToken, session.ownerId, vaultKey, vaultKeyId,
    );
    await persistEncryptedRefreshToken(db as unknown as JaspicVaultDbClient, session.ownerId, encrypted);
    return resultPage(true);
  } catch {
    // Never expose/log the authorization code, tokens or secret-bearing URL.
    return resultPage(false);
  }
}
