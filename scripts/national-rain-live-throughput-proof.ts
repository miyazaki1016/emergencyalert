import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { fetchForecastTargetTimes, type JmaTargetTime } from "../lib/weather/providers/jma/targetTimes";
import { fetchObservationTargetTimes } from "../lib/weather/providers/jma/observationTargetTimes";
import { candidateKey, heavyRainAreaPolygons, scanHeavyRainTile } from "../lib/weather/rain/nationalHeavyRain";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { N03_PREFECTURE_INDEX_2026 } from "../lib/weather/rain/n03PrefectureIndex2026";
import { prefecturesForRainPolygons } from "../lib/weather/rain/n03Prefectures";
import { resolveNationalRainMunicipalities } from "../lib/weather/rain/nationalRainMunicipalityResolver";
import { stagedRefinementJobsFromCoarseCandidates } from "../lib/weather/rain/nationalRainQueue";
import type { ClaimedNationalRainJob } from "../lib/weather/rain/nationalRainWorker";
import { localPreparedLoader, prepareProofN03 } from "./national-rain-proof-n03";
import { measureWorker } from "./national-rain-throughput-harness";

async function main() {
  const root = process.env.N03_CACHE_DIR || mkdtempSync(join(tmpdir(), "national-rain-throughput-"));
  mkdirSync(root, { recursive: true });
  const discoveryStarted = performance.now();
  const [observations, frames] = await Promise.all([fetchObservationTargetTimes(), fetchForecastTargetTimes()]);
  const current = observations[0];
  if (!current || !frames.length) throw new Error("No JMA target time");
  const coarseTiles = [[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
  const scan = async (frame: JmaTargetTime) => (await Promise.all(coarseTiles.map(async ([x,y]) => {
    const r = await fetch(buildJmaRainTileUrl(frame,4,x,y));
    if (!r.ok) {
      const error = new Error(`coarse JMA fetch failed ${r.status}`) as Error & { status?: number };
      error.status = r.status;
      throw error;
    }
    return scanHeavyRainTile(Buffer.from(await r.arrayBuffer()),4,x,y);
  }))).flat();
  const currentKeys = new Set((await scan(current)).map(candidateKey));
  const selected: ClaimedNationalRainJob[] = [];
  const counts: { frame: JmaTargetTime; requestedTiles: number }[] = [];
  for (const frame of frames) {
    const jobs = new Map<string, ReturnType<typeof stagedRefinementJobsFromCoarseCandidates>[number]>();
    const candidates = (await scan(frame)).filter(c => !currentKeys.has(candidateKey(c)));
    for (const j of stagedRefinementJobsFromCoarseCandidates(candidates, frame, 6)) {
      jobs.set(`${j.zoom}:${j.tileX}:${j.tileY}`, j);
    }
    counts.push({ frame, requestedTiles: jobs.size });
    for (const j of jobs.values()) {
      if (selected.length >= 4) break;
      selected.push({ id: selected.length + 1, run_key: j.runKey, basetime:j.basetime, validtime:j.validtime, zoom:j.zoom, tile_x:j.tileX, tile_y:j.tileY });
    }
  }
  const discoveryMs = performance.now() - discoveryStarted;
  const context = { mode:"READ_ONLY_LIVE_THROUGHPUT_PROOF", counts, requestedTiles: counts.reduce((sum,c) => sum+c.requestedTiles,0), discoveryMs };
  if (!selected.length) { console.log(JSON.stringify({ ...context, skipped:true, reason:"NO_LIVE_UPCOMING_HEAVY_RAIN", capacityExtrapolationAllowed:false })); return; }
  // Staged refinement starts at z6. Intermediate stages only screen and enqueue
  // the next zoom; municipality resolution belongs to final z10 jobs.
  const rows = [];
  for (const job of selected) {
    const r = await fetch(buildJmaRainTileUrl(job,job.zoom,job.tile_x,job.tile_y));
    if (!r.ok) throw new Error(`refinement preflight failed ${r.status}`);
    const candidates = scanHeavyRainTile(Buffer.from(await r.arrayBuffer()),job.zoom,job.tile_x,job.tile_y,1);
    rows.push({ job, strongPixels:candidates.length });
  }
  const loader = localPreparedLoader(root);
  const resolveMunicipalities = (footprint: Parameters<typeof resolveNationalRainMunicipalities>[0]) => resolveNationalRainMunicipalities(footprint,loader.load);
  for (const phase of ["COLD_PREPARED", "WARM_PREPARED"] as const) {
    const measured = await measureWorker({ jobs:selected, concurrency:4, fetcher:fetch, resolveMunicipalities });
    console.log(JSON.stringify({ ...context, phase, rows, downloads:loader.downloads, ...measured,
      evidence: measured.result.strongPixels > 0 ? "LIVE_STRONG_PIXELS" : "NO_REFINEMENT_STRONG_PIXELS",
      n03Source:"Local prepared files through production Storage-loader code; NOT live private Storage HTTP",
    }));
  }
}
main().catch((e: Error & { status?: number }) => {
  if (e?.status === 404) {
    console.log(JSON.stringify({
      mode:"READ_ONLY_LIVE_THROUGHPUT_PROOF",
      skipped:true,
      reason:"LIVE_JMA_COARSE_TILE_UNAVAILABLE",
      detail:e.message,
      capacityExtrapolationAllowed:false,
      note:"Read-only live throughput evidence is unavailable for this CI moment. Production queue semantics remain fail-closed; this skip does not treat missing JMA data as no rain.",
    }));
    return;
  }
  console.error(e);
  process.exitCode=1;
});
