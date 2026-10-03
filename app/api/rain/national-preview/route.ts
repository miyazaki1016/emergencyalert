import { NextResponse } from "next/server";
import { fetchObservationTargetTimes } from "@/lib/weather/providers/jma/observationTargetTimes";
import { fetchForecastTargetTimes } from "@/lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "@/lib/weather/providers/jma/tileUrl";
import { candidateKey, scanHeavyRainTile, type HeavyRainCandidate } from "@/lib/weather/rain/nationalHeavyRain";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ZOOM = 4;
// JMA zoom-4 tiles covering Japan and nearby islands. This is intentionally
// coarse for the first nationwide proof; later stages will refine detected areas.
const JAPAN_TILES = [
  [13, 5], [14, 5],
  [13, 6], [14, 6],
  [13, 7], [14, 7],
] as const;

async function fetchTile(frame: { basetime: string; validtime: string }, x: number, y: number) {
  const response = await fetch(buildJmaRainTileUrl(frame, ZOOM, x, y), { cache: "no-store" });
  if (!response.ok) throw new Error(`tile fetch failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function scanFrame(frame: { basetime: string; validtime: string }) {
  const parts = await Promise.all(JAPAN_TILES.map(async ([x, y]) => {
    try {
      return scanHeavyRainTile(await fetchTile(frame, x, y), ZOOM, x, y);
    } catch {
      return [] as HeavyRainCandidate[];
    }
  }));
  return parts.flat();
}

export async function GET() {
  try {
    const [observations, forecasts] = await Promise.all([
      fetchObservationTargetTimes(),
      fetchForecastTargetTimes(),
    ]);
    const current = observations[0];
    if (!current) throw new Error("observation unavailable");

    const currentStrong = new Set((await scanFrame(current)).map(candidateKey));
    const frames = [];
    for (const forecast of forecasts) {
      const candidates = (await scanFrame(forecast)).filter((candidate) => !currentStrong.has(candidateKey(candidate)));
      const counts = { heavy: 0, veryHeavy: 0, torrential: 0 };
      for (const candidate of candidates) {
        if (candidate.level === "HEAVY") counts.heavy++;
        if (candidate.level === "VERY_HEAVY") counts.veryHeavy++;
        if (candidate.level === "TORRENTIAL") counts.torrential++;
      }
      frames.push({
        baseTime: forecast.basetime,
        validTime: forecast.validtime,
        counts,
        // Preview only: cap payload. Area clustering/geocoding is the next stage.
        candidates: candidates.slice(0, 200),
      });
    }

    return NextResponse.json({
      mode: "NATIONWIDE_HEAVY_RAIN_PROOF",
      threshold: "forecast >= 30 mm/h while current corresponding pixel is < 30 mm/h",
      zoom: ZOOM,
      checkedAt: new Date().toISOString(),
      currentValidTime: current.validtime,
      frames,
      note: "Proof endpoint only. It does not publish alerts or affect existing watch targets/push notifications.",
    });
  } catch {
    return NextResponse.json({ error: "NATIONAL_RAIN_SCAN_UNAVAILABLE" }, { status: 503 });
  }
}
