/** Issue #238: branch-scoped, admin-authenticated, first-message-only isolated send. */
import { createClient } from "@supabase/supabase-js";
import { isJaspicAdmin } from "../../../../lib/jaspic/admin-authorization";
import { isolatedStagedRows, isolatedDbPort } from "../../../../lib/jaspic/isolated-db-adapter-238";
import { getIsolatedGmailAccessToken } from "../../../../lib/jaspic/isolated-vault-access-238";
import { createIsolatedMailResolver } from "../../../../lib/jaspic/isolated-mail-resolver-238";
import { runVerifiedIsolatedFirstMail } from "../../../../lib/jaspic/isolated-first-mail-238";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const reply = (status: number, result: string, extra?: Record<string, unknown>) =>
  Response.json({ result, ...extra }, { status, headers: { "Cache-Control": "no-store, private" } });

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "preview" ||
      process.env.VERCEL_GIT_COMMIT_REF !== "test/jaspic-238-isolated-bulk")
    return reply(404, "not-found");
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin) return reply(403, "forbidden");
  const bearer = /^Bearer ([A-Za-z0-9_.-]{16,8192})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!bearer) return reply(401, "unauthorized");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const ownerId = process.env.JASPIC_ADMIN_USER_ID;
  const adminEmail = process.env.JASPIC_OAUTH_ADMIN_EMAIL;
  const dispatchToken = process.env.JASPIC_DISPATCH_TOKEN;
  const productionPreview = process.env.JASPIC_ISOLATED_PREVIEW_URL_238;
  if (!url || !publicKey || !ownerId || !adminEmail || !dispatchToken ||
      productionPreview !== "https://emergencyalert.news/jaspic/dispatch/preview")
    return reply(503, "not-configured");
  try {
    const { data, error } = await createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).auth.getUser(bearer);
    if (error || !data.user || !isJaspicAdmin(data.user, ownerId) ||
        !data.user.email_confirmed_at || data.user.email?.toLowerCase() !== adminEmail.toLowerCase())
      return reply(403, "forbidden");

    // Fail closed before acquiring an OAuth token or claiming a DB row.
    const previewResponse = await fetch(productionPreview, {
      method: "POST", headers: { Authorization: "Bearer " + dispatchToken },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(45000),
    });
    if (!previewResponse.ok) return reply(503, "preview-unavailable");
    const preview: unknown = await previewResponse.json();
    const staged = await isolatedStagedRows();
    const { verifyIsolatedSendSnapshot } = await import("../../../../lib/jaspic/isolated-send-gate-238");
    verifyIsolatedSendSnapshot(preview, staged);
    const allowedKeys = new Set(staged.map(row => row.prefecture + "|" + row.source_id));
    const mailFor = await createIsolatedMailResolver(allowedKeys);
    const token = await getIsolatedGmailAccessToken(data.user.id, fetch);
    const result = await runVerifiedIsolatedFirstMail({
      ...isolatedDbPort(mailFor),
      freshPreview: async () => preview,
      stagedRows: async () => staged,
    }, token, fetch);
    return reply(result.sent === 1 ? 200 : 409, result.sent === 1 ? "first-sent" : "first-not-sent", result);
  } catch {
    // Unknown delivery state is never retried automatically.
    return reply(503, "isolated-send-unavailable");
  }
}
