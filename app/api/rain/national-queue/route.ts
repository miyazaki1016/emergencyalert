import { NextRequest, NextResponse } from "next/server";
import { fetchObservationTargetTimes } from "@/lib/weather/providers/jma/observationTargetTimes";
import { fetchForecastTargetTimes } from "@/lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "@/lib/weather/providers/jma/tileUrl";
import { candidateKey, scanHeavyRainTile, type HeavyRainCandidate } from "@/lib/weather/rain/nationalHeavyRain";
import {
  createNationalRainQueueClient,
  enqueueNationalRainJobs,
  refinementJobFromCoarseCandidate,
  type NationalRainQueueJob,
} from "@/lib/weather/rain/nationalRainQueue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COARSE_ZOOM = 4;
const JAPAN_TILES = [
  [13, 5], [14, 5],
  [13, 6], [14, 6],
  [13, 7], [14, 7],
] as const;

function isAuthorized(request: NextRequest) {
  const secret = process.env.NATIONAL_RAIN_WORKER_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

async function scanFrame(frame: { basetime: string; validtime: string }) {
  const parts = await Promise.all(JAPAN_TILES.map(async ([x, y]) => {
    const response = await fetch(buildJmaRainTileUrl(frame, COARSE_ZOOM, x, y), { cache: "no-store" });
    if (!response.ok) throw new Error(`JMA coarse tile fetch failed: ${response.status}`);
    return scanHeavyRainTile(Buffer.from(await response.arrayBuffer()), COARSE_ZOOM, x, y);
  }));
  return parts.flat();
}

function uniqueJobs(candidates: HeavyRainCandidate[], frame: { basetime: string; validtime: string }) {
  const byTile = new Map<string, NationalRainQueueJob>();
  for (const candidate of candidates) {
    const job = refinementJobFromCoarseCandidate(candidate, frame);
    byTile.set(`${job.zoom}:${job.tileX}:${job.tileY}`, job);
  }
  return [...byTile.values()];
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const [observations, forecasts] = await Promise.all([
      fetchObservationTargetTimes(),
      fetchForecastTargetTimes(),
    ]);
    const current = observations[0];
    if (!current) throw new Error("observation unavailable");

    const currentStrong = new Set((await scanFrame(current)).map(candidateKey));
    const supabase = createNationalRainQueueClient();
    const frames = [];
    let requestedRefinementTiles = 0;

    for (const forecast of forecasts) {
      const candidates = (await scanFrame(forecast))
        .filter((candidate) => !currentStrong.has(candidateKey(candidate)));
      const jobs = uniqueJobs(candidates, forecast);
      await enqueueNationalRainJobs(supabase, jobs);
      requestedRefinementTiles += jobs.length;
      frames.push({ validTime: forecast.validtime, coarseCandidates: candidates.length, refinementTiles: jobs.length });
    }

    return NextResponse.json({
      mode: "NATIONAL_RAIN_QUEUE_PROOF",
      checkedAt: new Date().toISOString(),
      currentValidTime: current.validtime,
      requestedRefinementTiles,
      frames,
      note: "Proof queue only. It does not publish alerts or affect watch targets/push notifications.",
    });
  } catch (error) {
    console.error("[national-rain-queue]", error);
    return NextResponse.json({ error: "NATIONAL_RAIN_QUEUE_FAILED" }, { status: 503 });
  }
}
