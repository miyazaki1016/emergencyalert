import { NextRequest, NextResponse } from "next/server";
import { fetchObservationTargetTimes } from "@/lib/weather/providers/jma/observationTargetTimes";
import { fetchForecastTargetTimes } from "@/lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "@/lib/weather/providers/jma/tileUrl";
import { candidateKey, scanHeavyRainTile, type HeavyRainCandidate } from "@/lib/weather/rain/nationalHeavyRain";
import {
  createNationalRainQueueClient,
  enqueueNationalRainJobs,
  getLastCompletedNationalRainBasetime,
  saveNationalRainCycleState,
  stagedRefinementJobsFromCoarseCandidates,
  type NationalRainQueueJob,
} from "@/lib/weather/rain/nationalRainQueue";
import { decideNationalRainCycle, latestForecastBasetime } from "@/lib/weather/rain/nationalRainCycle";

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
  return stagedRefinementJobsFromCoarseCandidates(candidates, frame, 10);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const forecasts = await fetchForecastTargetTimes();
    const cycleBasetime = latestForecastBasetime(forecasts);
    const cycleForecasts = forecasts.filter((frame) => frame.basetime === cycleBasetime);
    const supabase = createNationalRainQueueClient();
    const lastCompletedBasetime = await getLastCompletedNationalRainBasetime(supabase);
    const decision = decideNationalRainCycle(cycleForecasts, { lastCompletedBasetime });

    if (decision.action === "SKIP") {
      return NextResponse.json({
        mode: "NATIONAL_RAIN_QUEUE_PROOF",
        checkedAt: new Date().toISOString(),
        cycleBasetime,
        cycleAction: decision.action,
        cycleReason: decision.reason,
        requestedRefinementTiles: 0,
        frames: [],
        note: "Proof queue only. This basetime was already completed, so the nationwide scan was skipped.",
      });
    }

    const observations = await fetchObservationTargetTimes();
    const current = observations[0];
    if (!current) throw new Error("observation unavailable");

    const currentStrong = new Set((await scanFrame(current)).map(candidateKey));
    const frames = [];
    const allJobs: NationalRainQueueJob[] = [];
    let usableFrames = 0;

    for (const forecast of cycleForecasts) {
      let scanned: HeavyRainCandidate[];
      try {
        scanned = await scanFrame(forecast);
      } catch (error) {
        // targetTimes can lead tile publication briefly. A frame is usable only
        // after every required z4 tile exists; unavailable is never "no rain".
        console.warn("[national-rain-queue] forecast frame not ready", forecast.validtime, error);
        continue;
      }
      usableFrames += 1;
      const candidates = scanned
        .filter((candidate) => !currentStrong.has(candidateKey(candidate)));
      const jobs = uniqueJobs(candidates, forecast);
      allJobs.push(...jobs);
      frames.push({ validTime: forecast.validtime, coarseCandidates: candidates.length, refinementZoom: 10, refinementTiles: jobs.length });
    }

    await enqueueNationalRainJobs(supabase, allJobs);
    const requiredFrames = cycleForecasts.length;
    const completed = requiredFrames > 0 && usableFrames === requiredFrames;
    await saveNationalRainCycleState(supabase, {
      basetime: cycleBasetime,
      requiredFrames,
      usableFrames,
      completed,
    });
    const requestedRefinementTiles = allJobs.length;

    return NextResponse.json({
      mode: "NATIONAL_RAIN_QUEUE_PROOF",
      checkedAt: new Date().toISOString(),
      currentValidTime: current.validtime,
      cycleBasetime,
      cycleAction: decision.action,
      cycleReason: decision.reason,
      cycleCompleted: completed,
      requiredFrames,
      usableFrames,
      requestedRefinementTiles,
      frames,
      note: "Proof queue only. It does not publish alerts or affect watch targets/push notifications.",
    });
  } catch (error) {
    console.error("[national-rain-queue]", error);
    return NextResponse.json({ error: "NATIONAL_RAIN_QUEUE_FAILED" }, { status: 503 });
  }
}
