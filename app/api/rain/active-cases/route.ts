import { NextResponse } from "next/server";
import { readActiveRainCaseSlugs } from "@/app/cases/[slug]/loadRainCase";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    return NextResponse.json(await readActiveRainCaseSlugs(), { headers });
  } catch {
    return NextResponse.json({ error: "ACTIVE_RAIN_CASES_UNAVAILABLE" }, { status: 503, headers });
  }
}
