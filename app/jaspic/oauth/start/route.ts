import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { verifyJaspicSupabaseIdentity } from "../../../../supabase/functions/_shared/jaspic/gmail-oauth-supabase-auth";
import { createSupabaseOAuthOnceStore } from "../../../../supabase/functions/_shared/jaspic/gmail-oauth-supabase-store";
import { prepareAdminGmailOAuthStart } from "../../../../supabase/functions/_shared/jaspic/gmail-web-start-offline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store, private",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

function disabled() {
  return NextResponse.json(
    { status: "disabled", message: "JASPIC authentication is not ready." },
    { status: 503, headers: responseHeaders },
  );
}

// Read-only legacy GET must never start consent or disclose a client ID.
export async function GET() { return disabled(); }

/**
 * Opt-in server-side OAuth start. Disabled unless the complete list of
 * runtime secrets and the reviewed migration are explicitly configured.
 * No real mail sending or Gmail API send endpoint is involved.
 */
export async function POST(request: NextRequest) {
  if (process.env.JASPIC_OAUTH_START_ENABLED !== "true") return disabled();
  const origin = request.headers.get("origin");
  if (origin !== "https://emergencyalert.news") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: responseHeaders });
  }
  const tokenHeader = request.headers.get("authorization") ?? "";
  const matched = /^Bearer ([A-Za-z0-9_.-]{16,8192})$/.exec(tokenHeader);
  if (!matched) {
    return NextResponse.json({ error: "Login required" }, { status: 401, headers: responseHeaders });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminId = process.env.JASPIC_OAUTH_ADMIN_SUBJECT;
  const adminEmail = process.env.JASPIC_OAUTH_ADMIN_EMAIL;
  const clientId = process.env.JASPIC_GOOGLE_WEB_CLIENT_ID;
  const cookieKey = process.env.JASPIC_OAUTH_COOKIE_KEY;
  if (!url || !anonKey || !serviceKey || !adminId || !adminEmail || !clientId || !cookieKey ||
      !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) return disabled();
  try {
    const publicAuth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const identity = await verifyJaspicSupabaseIdentity(publicAuth, matched[1], {
      issuer: url + "/auth/v1",
    });
    const serviceDb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const prepared = await prepareAdminGmailOAuthStart({
      identity,
      adminPolicy: { expectedSubject: adminId, expectedEmail: adminEmail, expectedIssuer: url + "/auth/v1" },
      clientId,
      sessionEncryptionKey: cookieKey,
      stateStore: createSupabaseOAuthOnceStore(serviceDb),
    });
    // Authorization URL is returned only to a signed-in, allowlisted owner.
    // Callback remains permanently disabled until it can safely handle codes.
    const response = NextResponse.json({ authorizationUrl: prepared.authorizationUrl },
      { status: 200, headers: responseHeaders });
    response.cookies.set(prepared.cookiePolicy.name, prepared.sealedCookie, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 300,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Authentication unavailable" },
      { status: 403, headers: responseHeaders });
  }
}
