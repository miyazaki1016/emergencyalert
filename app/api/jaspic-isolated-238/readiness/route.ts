/** Issue #238: non-sending, Preview-only readiness assessment. No secrets in responses. */
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  const headers = { "Cache-Control": "no-store, private" };
  if (process.env.VERCEL_ENV !== "preview" ||
      process.env.VERCEL_GIT_COMMIT_REF !== "test/jaspic-238-isolated-bulk")
    return NextResponse.json({ result: "not-found" }, { status: 404, headers });
  const dbUrl = process.env.JASPIC_ISOLATED_DATABASE_URL_238;
  let dbConfigured = false;
  if (dbUrl) {
    try {
      const url = new URL(dbUrl);
      dbConfigured = (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
        decodeURIComponent(url.username) === "jaspic_isolated_login_238" &&
        url.hostname === "db.yqyevipvkdwmhcaxywes.supabase.co" &&
        url.pathname === "/postgres" && url.searchParams.get("sslmode") === "require" &&
        Boolean(url.password);
    } catch { /* fail closed */ }
  }
  // Gmail OAuth must use independently approved Preview-scoped credentials.
  // Never silently reuse or expose Production secrets.
  const gmailConfigured = Boolean(
    process.env.JASPIC_ISOLATED_GOOGLE_CLIENT_ID_238 &&
    process.env.JASPIC_ISOLATED_GOOGLE_CLIENT_SECRET_238 &&
    process.env.JASPIC_ISOLATED_GMAIL_REFRESH_TOKEN_238
  );
  return NextResponse.json({
    result: "preflight-only", dbConfigured, gmailConfigured,
    dbConnected: false, gmailTokenValidated: false,
    sendAdapterReady: false, mailSent: false
  }, { headers });
}
