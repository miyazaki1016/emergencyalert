import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This isolated preview deliberately DOES NOT include Google OAuth exchange,
// state registration, server secrets, or any mail transport.
function disabled() {
  return NextResponse.json(
    { status: "disabled", message: "Gmail OAuth is not yet enabled." },
    { status: 503, headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" } },
  );
}
export async function GET() { return disabled(); }
export async function POST() { return disabled(); }
