import { saveJaspicGmailSendConsent } from "../../../../lib/jaspic/oauth-gmail-send-callback-server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prepareJaspicIdentityCallback } from "../../../../lib/jaspic/oauth-identity-callback";
import { createSupabaseOAuthOnceStore, type JaspicOAuthDbClient } from "../../../../lib/jaspic/oauth-supabase-store";
import { GMAIL_OAUTH_COOKIE_POLICY, GMAIL_SEND_COOKIE_NAME } from "../../../../lib/jaspic/oauth-session-offline";
import { validateJaspicIdentityTokenResponse } from "../../../../lib/jaspic/oauth-identity-token-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function result(success: boolean) {
  const response = NextResponse.redirect(
    "https://emergencyalert.news/jaspic/oauth/result?status=" + (success ? "ok" : "unavailable"),
    { status: 303, headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" } },
  );
  response.cookies.set(GMAIL_OAUTH_COOKIE_POLICY.name, "", {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0,
  });
  return response;
}

/** Dispatches identity and Gmail consent using their purpose-bound cookies. */
export async function GET(request: NextRequest) {
  const sendCookie = request.cookies.get(GMAIL_SEND_COOKIE_NAME)?.value;
  if (sendCookie) {
    const success = await saveJaspicGmailSendConsent(request.url, sendCookie);
    const response = NextResponse.redirect("https://emergencyalert.news/jaspic/oauth/result?status=" + (success ? "gmail-vault-check" : "send-consent-failed"), { status: 303, headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" } });
    response.cookies.set(GMAIL_SEND_COOKIE_NAME, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  }
  if (process.env.JASPIC_OAUTH_START_ENABLED !== "true" ||
      process.env.JASPIC_OAUTH_CALLBACK_ENABLED !== "true") return result(false);
  const cookie = request.cookies.get(GMAIL_OAUTH_COOKIE_POLICY.name)?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.JASPIC_GOOGLE_WEB_CLIENT_ID;
  const clientSecret = process.env.JASPIC_GOOGLE_WEB_CLIENT_SECRET;
  const cookieKey = process.env.JASPIC_OAUTH_COOKIE_KEY;
  const owner = process.env.JASPIC_ADMIN_USER_ID;
  const expectedEmail = process.env.JASPIC_OAUTH_ADMIN_EMAIL;
  if (!cookie || !url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) ||
      !serviceKey || !clientId || !clientSecret || !cookieKey || !owner || !expectedEmail) return result(false);
  try {
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const exchange = await prepareJaspicIdentityCallback({
      callbackUrl: request.url, sealedCookie: cookie, cookieEncryptionKey: cookieKey,
      adminUserId: owner, clientId, clientSecret,
      stateStore: createSupabaseOAuthOnceStore(db as unknown as JaspicOAuthDbClient),
    });
    const response = await fetch(exchange.url, {
      method: exchange.method, headers: exchange.headers, body: exchange.body,
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return result(false);
    const token = validateJaspicIdentityTokenResponse(await response.json());
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: "Bearer " + token.accessToken },
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!profileResponse.ok) return result(false);
    const profile: unknown = await profileResponse.json();
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) return result(false);
    const user = profile as Record<string, unknown>;
    if (user.email_verified !== true || typeof user.sub !== "string" ||
        !/^[0-9]{8,32}$/.test(user.sub) ||
        typeof user.email !== "string" ||
        user.email.toLowerCase() !== expectedEmail.toLowerCase()) return result(false);
    return result(true);
  } catch {
    return result(false);
  }
}
