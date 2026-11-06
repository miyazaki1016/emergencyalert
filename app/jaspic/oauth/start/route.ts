import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { authorizeJaspicOAuthStart } from "../../../../lib/jaspic/oauth-start-authorization";

export const dynamic = "force-dynamic";
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
  if (process.env.JASPIC_OAUTH_START_ENABLED !== "true") return disabled();
  if (request.headers.get("origin") !== "https://emergencyalert.news") {
    return NextResponse.json({ authorized: false }, { status: 403, headers });
  }
  const token = /^Bearer ([A-Za-z0-9_.-]{16,8192})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return NextResponse.json({ authorized: false }, { status: 401, headers });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replaceAll(/\/$/g, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !url.startsWith("https://") || !url.endsWith(".supabase.co")) return disabled();
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ authorized: false }, { status: 401, headers });
    if (!authorizeJaspicOAuthStart(data.user, process.env.JASPIC_ADMIN_USER_ID, process.env.JASPIC_OAUTH_START_ENABLED)) {
      return NextResponse.json({ authorized: false }, { status: 403, headers });
    }
    // Authentication succeeds, but consent remains deliberately unimplemented.
    return disabled();
  } catch {
    return disabled();
  }
}
