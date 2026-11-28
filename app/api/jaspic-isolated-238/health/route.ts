/** Issue #238: read-only Preview configuration check. Never sends mail or queries a DB. */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const headers = { "Cache-Control": "no-store, private" };
  // Fail closed on Production, other branches, and local development.
  if (process.env.VERCEL_ENV !== "preview" ||
      process.env.VERCEL_GIT_COMMIT_REF !== "test/jaspic-238-isolated-bulk") {
    return NextResponse.json({ result: "not-found" }, { status: 404, headers });
  }
  const raw = process.env.JASPIC_ISOLATED_DATABASE_URL_238;
  if (!raw) return NextResponse.json({ result: "not-configured" }, { status: 503, headers });
  try {
    const url = new URL(raw);
    // Validate structure without logging or returning the credential.
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") throw new Error("scheme");
    if (decodeURIComponent(url.username) !== "jaspic_isolated_login_238" ||
        !url.password || url.pathname !== "/postgres" ||
        url.searchParams.get("sslmode") !== "require" ||
        !url.hostname.endsWith(".supabase.co")) throw new Error("configuration");
  } catch {
    return NextResponse.json({ result: "invalid-configuration" }, { status: 503, headers });
  }
  // This is NOT a successful DB connection or authorization check.
  return NextResponse.json({ result: "configuration-present", databaseConnected: false,
    gmailReady: false, mailSent: false }, { status: 200, headers });
}
