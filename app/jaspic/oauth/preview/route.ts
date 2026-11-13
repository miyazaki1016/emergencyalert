import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { isJaspicAdmin } from "../../../../lib/jaspic/admin-authorization";
import { POST as preview } from "../../dispatch/preview/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const respond = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex" } });

/** Admin-only read-only proxy. The dispatch secret never reaches the browser. */
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== "https://emergencyalert.news") {
    return respond({ error: "FORBIDDEN_ORIGIN" }, 403);
  }
  const token = /^Bearer ([A-Za-z0-9_.-]{16,8192})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return respond({ error: "UNAUTHORIZED" }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminId = process.env.JASPIC_ADMIN_USER_ID;
  const secret = process.env.JASPIC_DISPATCH_TOKEN;
  if (!url || !key || !adminId || !secret || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    return respond({ error: "NOT_CONFIGURED" }, 503);
  }
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return respond({ error: "UNAUTHORIZED" }, 401);
    if (!isJaspicAdmin(data.user, adminId)) return respond({ error: "FORBIDDEN" }, 403);
    const result = await preview(new Request("https://emergencyalert.news/jaspic/dispatch/preview", {
      method: "POST", headers: { authorization: "Bearer " + secret },
    }));
    return respond(await result.json(), result.status);
  } catch {
    return respond({ error: "PREVIEW_FAILED" }, 503);
  }
}
