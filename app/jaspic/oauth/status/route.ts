import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isJaspicAdmin } from "../../../../lib/jaspic/admin-authorization";

export const dynamic = "force-dynamic";

/** Read-only status. Does not enable Google OAuth or send email. */
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "no-store, private" };
  const token = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!token) return NextResponse.json({ authorized: false }, { status: 401, headers });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    return NextResponse.json({ authorized: false }, { status: 503, headers });
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ authorized: false }, { status: 401, headers });
  const authorized = isJaspicAdmin(data.user, process.env.JASPIC_ADMIN_USER_ID);
  return NextResponse.json({ authorized }, { status: authorized ? 200 : 403, headers });
}
