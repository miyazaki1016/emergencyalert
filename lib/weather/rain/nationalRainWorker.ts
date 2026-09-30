import { SupabaseClient } from "@supabase/supabase-js";
import { PNG } from "pngjs";
import { buildJmaRainTileUrl } from "../providers/jma/tileUrl";
import { heavyRainAreaPolygons, scanHeavyRainTile } from "./nationalHeavyRain";
import { claimNationalRainJobs, deferNationalRainJob, enqueueNationalRainJobs, finishNationalRainJob, saveNationalRainRefinementResult, stagedRefinementJobsFromCoarseCandidates } from "./nationalRainQueue";
import type { NationalRainMunicipality } from "./nationalRainMunicipalities";

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

export async function processNationalRainRefinementJobs(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    concurrency?: number;
    fetcher?: typeof fetch;
    resolveMunicipalities?: (footprint: ReturnType<typeof heavyRainAreaPolygons>) => Promise<NationalRainMunicipality[]>;
    budgetMs?: number;
    now?: () => number;
  } = {},
): Promise<NationalRainWorkerResult> {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  const budgetMs = Math.max(1, options.budgetMs ?? 45_000);
  const deadline = now() + budgetMs;
  const limit = Math.max(1, options.limit ?? 10);
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, limit));
  const result: NationalRainWorkerResult = { claimed: 0, done: 0, failed: 0, strongPixels: 0, deferred: 0 };

  const processJob = async (job: ClaimedNationalRainJob) => {
    try {
      const response = await fetcher(
        buildJmaRainTileUrl({ basetime: job.basetime, validtime: job.validtime }, job.zoom, job.tile_x, job.tile_y),
      );
      if (!response.ok) throw new Error(`JMA tile fetch failed: ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      PNG.sync.read(buffer);
      const strongCandidates = scanHeavyRainTile(buffer, job.zoom, job.tile_x, job.tile_y, 1);
      const strongPixelCount = strongCandidates.length;
      result.strongPixels += strongPixelCount;

      if (job.zoom === 6 || job.zoom === 8) {
        const nextZoom = job.zoom === 6 ? 8 : 10;
        const nextJobs = stagedRefinementJobsFromCoarseCandidates(
          strongCandidates,
          { basetime: job.basetime, validtime: job.validtime },
          nextZoom,
          job.zoom,
        );
        await enqueueNationalRainJobs(supabase, nextJobs);
      } else if (job.zoom === 10) {
        const footprint = heavyRainAreaPolygons(strongCandidates, job.zoom);
        const municipalities = options.resolveMunicipalities
          ? await options.resolveMunicipalities(footprint)
          : [];
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
      } else {
        throw new Error(`Unsupported national rain refinement zoom: ${job.zoom}`);
      }
      await finishNationalRainJob(supabase, job.id, true);
      result.done += 1;
    } catch (error) {
      await finishNationalRainJob(
        supabase,
        job.id,
        false,
        error instanceof Error ? error.message : String(error),
      );
      result.failed += 1;
    }
  };

  while (result.claimed < limit && now() < deadline) {
    const batchSize = Math.min(concurrency, limit - result.claimed);
    const jobs = (await claimNationalRainJobs(supabase, batchSize)) as ClaimedNationalRainJob[];
    if (jobs.length === 0) break;
    result.claimed += jobs.length;

    const runnable: ClaimedNationalRainJob[] = [];
    for (const job of jobs) {
      if (now() >= deadline) {
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
