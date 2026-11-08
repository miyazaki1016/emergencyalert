import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isJaspicAdmin } from "../../../../lib/jaspic/admin-authorization";
import { readEncryptedGmailRefreshToken } from "../../../../lib/jaspic/oauth-gmail-token-store-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, private" };
const reply = (status: number, result: string) => NextResponse.json({ result }, { status, headers: noStore });

/** Manually triggered, single-recipient test. No cron, bulk recipients, or arbitrary addresses. */
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== "https://emergencyalert.news") return reply(403, "forbidden");
  if (process.env.JASPIC_SINGLE_TEST_SEND_ENABLED !== "true") return reply(503, "disabled");
  const bearer = /^Bearer ([A-Za-z0-9_.-]{16,8192})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!bearer) return reply(401, "unauthorized");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerId = process.env.JASPIC_ADMIN_USER_ID;
  const email = process.env.JASPIC_OAUTH_ADMIN_EMAIL;
  const vaultKey = process.env.JASPIC_GMAIL_TOKEN_VAULT_KEY;
  const clientId = process.env.JASPIC_GOOGLE_WEB_CLIENT_ID;
  const clientSecret = process.env.JASPIC_GOOGLE_WEB_CLIENT_SECRET;
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !publicKey || !serviceKey ||
      !ownerId || !email || !vaultKey || !clientId || !clientSecret) return reply(503, "not-configured");
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  try {
    const { data, error } = await createClient(url, publicKey, opts).auth.getUser(bearer);
    if (error || !data.user || !isJaspicAdmin(data.user, ownerId) ||
        !data.user.email_confirmed_at || data.user.email?.toLowerCase() !== email.toLowerCase()) {
      return reply(403, "forbidden");
    }
    const db = createClient(url, serviceKey, opts);
    const refreshToken = await readEncryptedGmailRefreshToken({
      db, ownerId: data.user.id, expectedAdminId: ownerId, encryptionKey: vaultKey,
    });
    if (!refreshToken) return reply(409, "gmail-not-connected");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret,
        refresh_token: refreshToken, grant_type: "refresh_token" }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) return reply(502, "token-refresh-failed");
    const tokenData: unknown = await tokenResponse.json();
    if (!tokenData || typeof tokenData !== "object" || !("access_token" in tokenData) ||
        typeof tokenData.access_token !== "string" || tokenData.access_token.length < 8) {
      return reply(502, "token-invalid");
    }
    // The recipient is exclusively the verified administrator, never request-supplied.
    if (!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email)) return reply(503, "invalid-admin-email");
    const subject = "JASPIC Gmail送信テスト";
    const body = "JASPICのGmail送信テストです。自動配信・一斉配信は開始していません。";
    const raw = Buffer.from(
      "To: " + email + "\r\n" +
      "Subject: =?UTF-8?B?" + Buffer.from(subject).toString("base64") + "?=\r\n" +
      "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n" +
      "Content-Transfer-Encoding: base64\r\n\r\n" +
      Buffer.from(body).toString("base64") + "\r\n"
    ).toString("base64url");
    const send = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: "Bearer " + tokenData.access_token, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }), cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!send.ok) return reply(502, "gmail-send-failed");
    return reply(200, "sent");
  } catch {
    return reply(503, "test-send-unavailable");
  }
}
