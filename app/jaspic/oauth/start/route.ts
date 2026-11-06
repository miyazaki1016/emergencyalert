import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { authorizeJaspicOAuthStart } from "../../../../lib/jaspic/oauth-start-authorization";
import { prepareJaspicAdminIdentityStart } from "../../../../lib/jaspic/oauth-identity-start";
import { createSupabaseOAuthOnceStore, type JaspicOAuthDbClient } from "../../../../lib/jaspic/oauth-supabase-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };

function disabled() {
  return NextResponse.json({ status: "disabled", message: "Gmail OAuth is not yet enabled." }, { status: 503, headers });
}

// GET never starts consent, including when the flag is enabled.
export async function GET() { return disabled(); }

/**
 * Admin-authenticated staging gate only. This route intentionally NEVER
 * returns a Google authorization URL or writes state/cookies/tokens.
 * Enabling the flag alone cannot activate Gmail consent or mail sending.
 */
export async function POST(request: NextRequest) {
  if (process.env.JASPIC_OAUTH_START_ENABLED !== "true" || process.env.JASPIC_OAUTH_CALLBACK_ENABLED !== "true") return disabled();
  if (request.headers.get("origin") !== "https://emergencyalert.news") {
    return NextResponse.json({ authorized: false }, { status: 403, headers });
  }
  const token = /^Bearer ([A-Za-z0-9_.-]{16,8192})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return NextResponse.json({ authorized: false }, { status: 401, headers });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replaceAll(/\/$/g, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) return disabled();
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ authorized: false }, { status: 401, headers });
    if (!authorizeJaspicOAuthStart(data.user, process.env.JASPIC_ADMIN_USER_ID, process.env.JASPIC_OAUTH_START_ENABLED)) {
      return NextResponse.json({ authorized: false }, { status: 403, headers });
    }
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const clientId = process.env.JASPIC_GOOGLE_WEB_CLIENT_ID;
    const cookieKey = process.env.JASPIC_OAUTH_COOKIE_KEY;
    if (!serviceKey || !clientId || !cookieKey) return disabled();
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const prepared = await prepareJaspicAdminIdentityStart({
      verifiedOwnerId: data.user.id, adminUserId: process.env.JASPIC_ADMIN_USER_ID,
      clientId, cookieEncryptionKey: cookieKey,
      stateStore: createSupabaseOAuthOnceStore(db as unknown as JaspicOAuthDbClient),
    });
    const response = NextResponse.json({ authorizationUrl: prepared.authorizationUrl }, { headers });
    response.cookies.set(prepared.cookiePolicy.name, prepared.sealedCookie, prepared.cookiePolicy);
    return response;
  } catch {
    return disabled();
  }
}
