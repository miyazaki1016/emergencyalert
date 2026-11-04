import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Safe placeholder while admin verification, one-time CSRF storage,
 * refresh-token vault and Google exchange remain under review.
 * No callback input is read, logged, reflected, or exchanged.
 */
export async function GET() {
  return new NextResponse(
    "<!doctype html><html lang=\"ja\"><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex,nofollow\"></head><body><main><h1>JASPIC認証は準備中です</h1><p>現在、認証結果を受け取ることはできません。</p></main></body></html>",
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Security-Policy": "default-src 'none'; style-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      },
    },
  );
}
