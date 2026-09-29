import { NextRequest, NextResponse } from "next/server";
import { createNationalRainQueueClient } from "@/lib/weather/rain/nationalRainQueue";
import { processNationalRainRefinementJobs } from "@/lib/weather/rain/nationalRainWorker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest) {
  const secret = process.env.NATIONAL_RAIN_WORKER_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 50)) : 10;

  try {
    const supabase = createNationalRainQueueClient();
    const result = await processNationalRainRefinementJobs(supabase, { limit });
    return NextResponse.json({
      mode: "NATIONAL_RAIN_REFINEMENT_WORKER_PROOF",
      checkedAt: new Date().toISOString(),
      ...result,
      note: "Proof worker only. It does not publish alerts or affect watch targets/push notifications.",
    });
  } catch (error) {
    console.error("[national-rain-worker]", error);
    return NextResponse.json({ error: "NATIONAL_RAIN_WORKER_FAILED" }, { status: 503 });
  }
}
