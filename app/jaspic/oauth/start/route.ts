import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { status: "disabled", message: "JASPIC authentication is not ready." },
    { status: 503, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
  );
}
