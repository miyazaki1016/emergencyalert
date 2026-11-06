import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isJaspicAdmin } from "../../../../lib/jaspic/admin-authorization";
import {
  deleteEncryptedGmailRefreshToken,
  readEncryptedGmailRefreshToken,
} from "../../../../lib/jaspic/oauth-gmail-token-store-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store, private" };
const respond = (body: object, status = 200) => NextResponse.json(body, { status, headers });

async function handle(request: NextRequest, remove: boolean) {
  if (remove && request.headers.get("origin") !== "https://emergencyalert.news") {
    return respond({ authorized: false }, 403);
  }
  const token = /^Bearer ([A-Za-z0-9_.-]{16,8192})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return respond({ authorized: false }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    return respond({ authorized: false }, 503);
  }
  const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
  try {
    const { data, error } = await createClient(url, key, authOptions).auth.getUser(token);
    if (error || !data.user) return respond({ authorized: false }, 401);
    const expectedAdminId = process.env.JASPIC_ADMIN_USER_ID;
    if (!expectedAdminId || !isJaspicAdmin(data.user, expectedAdminId)) {
      return respond({ authorized: false }, 403);
    }
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const encryptionKey = process.env.JASPIC_GMAIL_TOKEN_VAULT_KEY;
    if (!serviceKey || (!remove && !encryptionKey)) {
      return respond({ authorized: true, vault: "unavailable" }, remove ? 503 : 200);
    }
    const access = { db: createClient(url, serviceKey, authOptions), ownerId: data.user.id, expectedAdminId };
    try {
      if (remove) {
        await deleteEncryptedGmailRefreshToken(access);
        return respond({ authorized: true, vault: "empty" });
      }
      if (!encryptionKey) return respond({ authorized: true, vault: "unavailable" });
      const saved = (await readEncryptedGmailRefreshToken({ ...access, encryptionKey })) !== null;
      return respond({ authorized: true, vault: saved ? "saved" : "empty" });
    } catch {
      return respond({ authorized: true, vault: "unavailable" }, remove ? 503 : 200);
    }
  } catch {
    return respond({ authorized: false }, 503);
  }
}

export async function GET(request: NextRequest) { return handle(request, false); }
export async function DELETE(request: NextRequest) { return handle(request, true); }
