import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { authorizeJaspicOAuthStart } from "../../../../lib/jaspic/oauth-start-authorization";
import { prepareJaspicGmailSendConsentOffline } from "../../../../lib/jaspic/oauth-gmail-send-consent-offline";
import { sealGmailWebSessionOffline } from "../../../../lib/jaspic/oauth-session-offline";
import { registerOAuthStateOffline } from "../../../../lib/jaspic/oauth-once-offline";
import { createSupabaseOAuthOnceStore, type JaspicOAuthDbClient } from "../../../../lib/jaspic/oauth-supabase-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" };
const unavailable = () => NextResponse.json({ status: "unavailable" }, { status: 503, headers });
export async function GET() { return unavailable(); }
export async function POST(request: NextRequest) {
  if (process.env.JASPIC_GMAIL_SEND_CONSENT_ENABLED !== "true" ||
      request.headers.get("origin") !== "https://emergencyalert.news") return unavailable();
  const token = /^Bearer ([A-Za-z0-9_.-]{16,8192})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return NextResponse.json({ authorized: false }, { status: 401, headers });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.JASPIC_GOOGLE_WEB_CLIENT_ID;
  const cookieKey = process.env.JASPIC_OAUTH_COOKIE_KEY;
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) ||
      !key || !service || !clientId || !cookieKey) return unavailable();
  try {
    const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.getUser(token);
    if (error || !data.user || !authorizeJaspicOAuthStart(data.user, process.env.JASPIC_ADMIN_USER_ID, "true"))
      return NextResponse.json({ authorized: false }, { status: 403, headers });
    const consent = await prepareJaspicGmailSendConsentOffline(clientId);
    const sealed = await sealGmailWebSessionOffline(consent.state, consent.codeVerifier, cookieKey, Date.now(), data.user.id);
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    await registerOAuthStateOffline(createSupabaseOAuthOnceStore(db as unknown as JaspicOAuthDbClient),
      consent.state, data.user.id, Date.now() + 300000);
    const response = NextResponse.json({ authorizationUrl: consent.authorizationUrl }, { headers });
    response.cookies.set("__Host-jaspic-send-consent", sealed, {
      path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 300,
    });
    return response;
  } catch { return unavailable(); }
}
