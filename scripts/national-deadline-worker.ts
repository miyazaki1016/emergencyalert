// Isolated proof only. Not used by routes. Final RPC stubs cannot certify real DB bounds.
import { SupabaseClient } from "@supabase/supabase-js";
import { PNG } from "pngjs";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { heavyRainAreaPolygons, scanHeavyRainTile } from "../lib/weather/rain/nationalHeavyRain";
import { claimNationalRainJobs, deferNationalRainJob, finishNationalRainJob, saveNationalRainRefinementResult } from "../lib/weather/rain/nationalRainQueue";
import type { NationalRainMunicipality } from "../lib/weather/rain/nationalRainMunicipalities";

export type ClaimedNationalRainJob = {
  id: number;
  run_key: string;
  basetime: string;
  validtime: string;
  zoom: number;
  tile_x: number;
  tile_y: number;
};

export type NationalRainWorkerResult = {
  claimed: number;
  done: number;
  failed: number;
  strongPixels: number;
  deferred: number;
};

export async function processDeadlineProofJobs(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    concurrency?: number;
    fetcher?: typeof fetch;
    resolveMunicipalities?: (footprint: ReturnType<typeof heavyRainAreaPolygons>) => Promise<NationalRainMunicipality[]>;
    budgetMs?: number;
    now?: () => number;
    signal?: AbortSignal;
    admissionMs?: number;
    finalReserveMs?: number;
  } = {},
): Promise<NationalRainWorkerResult> {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  const budgetMs = Math.max(1, options.budgetMs ?? 45_000);
  const deadline = now() + budgetMs;
  const limit = Math.max(1, options.limit ?? 10);
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, limit));
  const result: NationalRainWorkerResult = { claimed: 0, done: 0, failed: 0, strongPixels: 0, deferred: 0 };

  const finalReserve = options.finalReserveMs ?? 3000;
  const admission = options.admissionMs ?? 20000;
  const signal = options.signal ?? AbortSignal.timeout(Math.max(1,budgetMs-finalReserve));
  const check = () => { signal.throwIfAborted(); if(now() >= deadline-finalReserve) throw new Error("PROOF_DEADLINE"); };
  const processJob = async (job: ClaimedNationalRainJob) => {
    try {
      check();
      const response = await fetcher(
        buildJmaRainTileUrl({ basetime: job.basetime, validtime: job.validtime }, job.zoom, job.tile_x, job.tile_y), { signal },
      );
      if (!response.ok) throw new Error(`JMA tile fetch failed: ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      check();
      PNG.sync.read(buffer);
      const strongCandidates = scanHeavyRainTile(buffer, job.zoom, job.tile_x, job.tile_y, 1);
      const strongPixelCount = strongCandidates.length;
      const footprint = heavyRainAreaPolygons(strongCandidates, job.zoom);
      const municipalities = options.resolveMunicipalities
        ? await options.resolveMunicipalities(footprint)
        : [];
      check();
      result.strongPixels += strongPixelCount;
      await saveNationalRainRefinementResult(supabase, {
        jobId: job.id,
        runKey: job.run_key,
        basetime: job.basetime,
        validtime: job.validtime,
        zoom: job.zoom,
        tileX: job.tile_x,
        tileY: job.tile_y,
        strongPixelCount,
        footprint,
        municipalities,
      });
      await finishNationalRainJob(supabase, job.id, true);
      result.done += 1;
    } catch (error) {
      if (signal.aborted || now() >= deadline-finalReserve || (error instanceof Error && error.message === "PROOF_DEADLINE")) {
        await deferNationalRainJob(supabase,job.id); result.deferred++; return;
      }
      await finishNationalRainJob(
        supabase,
        job.id,
        false,
        error instanceof Error ? error.message : String(error),
      );
      result.failed += 1;
    }
  };

  while (result.claimed < limit && now() + admission + finalReserve < deadline && !signal.aborted) {
    const batchSize = Math.min(concurrency, limit - result.claimed);
    const jobs = (await claimNationalRainJobs(supabase, batchSize)) as ClaimedNationalRainJob[];
    if (jobs.length === 0) break;
    result.claimed += jobs.length;

    const runnable: ClaimedNationalRainJob[] = [];
    for (const job of jobs) {
      if (now() + admission + finalReserve >= deadline || signal.aborted) {
        result.deferred += 1;
        await deferNationalRainJob(supabase, job.id);
      } else {
        runnable.push(job);
      }
    }
    await Promise.all(runnable.map(processJob));
  }

  return result;
}
