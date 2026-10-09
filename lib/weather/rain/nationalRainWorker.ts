import { SupabaseClient } from "@supabase/supabase-js";
import { PNG } from "pngjs";
import { buildJmaRainTileUrl } from "../providers/jma/tileUrl";
import { heavyRainAreaPolygons, scanHeavyRainTile } from "./nationalHeavyRain";
import { claimNationalRainJobs, completeNationalRainJob, deferNationalRainJob, finishNationalRainJob, stagedRefinementJobsFromCoarseCandidates } from "./nationalRainQueue";
import type { NationalRainMunicipality } from "./nationalRainMunicipalities";

export type ClaimedNationalRainJob = {
  id: number;
  lease_token: string;
  run_key: string;
  basetime: string;
  validtime: string;
  zoom: number;
  tile_x: number;
  tile_y: number;
  scan_min_x?: number;
  scan_min_y?: number;
  scan_max_x?: number;
  scan_max_y?: number;
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
    resolveMunicipalities?: (footprint: ReturnType<typeof heavyRainAreaPolygons>, signal?: AbortSignal) => Promise<NationalRainMunicipality[]>;
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
  const finalReserveMs = Math.max(0, options.finalReserveMs ?? 3_000);
  const admissionMs = Math.max(0, options.admissionMs ?? 20_000);
  const workDeadline = deadline - finalReserveMs;
  const timeoutMs = Math.max(1, workDeadline - now());
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  const finalSignal = AbortSignal.timeout(Math.max(1, deadline - now()));
  const deadlineReached = () => signal.aborted || now() >= workDeadline;
  const checkDeadline = () => {
    if (deadlineReached()) throw new Error("NATIONAL_RAIN_DEADLINE");
  };

  if (signal.aborted) return result;

  const processJob = async (job: ClaimedNationalRainJob) => {
    try {
      checkDeadline();
      const response = await fetcher(
        buildJmaRainTileUrl({ basetime: job.basetime, validtime: job.validtime }, job.zoom, job.tile_x, job.tile_y),
        { signal },
      );
      if (!response.ok) throw new Error(`JMA tile fetch failed: ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      checkDeadline();
      PNG.sync.read(buffer);
      const strongCandidates = scanHeavyRainTile(buffer, job.zoom, job.tile_x, job.tile_y, 1, {
        minX: job.scan_min_x ?? 0,
        minY: job.scan_min_y ?? 0,
        maxX: job.scan_max_x ?? 255,
        maxY: job.scan_max_y ?? 255,
      });
      const strongPixelCount = strongCandidates.length;
      result.strongPixels += strongPixelCount;

      let completion: Parameters<typeof completeNationalRainJob>[3] = {};
      if (job.zoom === 6 || job.zoom === 8) {
        const nextZoom = job.zoom === 6 ? 8 : 10;
        completion = {
          children: stagedRefinementJobsFromCoarseCandidates(
            strongCandidates,
            { basetime: job.basetime, validtime: job.validtime },
            nextZoom,
            job.zoom,
          ),
        };
      } else if (job.zoom === 10) {
        const footprint = heavyRainAreaPolygons(strongCandidates, job.zoom);
        const municipalities = options.resolveMunicipalities
          ? await options.resolveMunicipalities(footprint, signal)
          : [];
        checkDeadline();
        completion = {
          result: {
            runKey: job.run_key,
            basetime: job.basetime,
            validtime: job.validtime,
            zoom: job.zoom,
            tileX: job.tile_x,
            tileY: job.tile_y,
            strongPixelCount,
            footprint,
            municipalities,
          },
        };
      } else {
        throw new Error(`Unsupported national rain refinement zoom: ${job.zoom}`);
      }

      const outcome = await completeNationalRainJob(supabase, job.id, job.lease_token, completion, finalSignal);
      if (outcome === "STALE_LEASE") return;
      result.done += 1;
    } catch (error) {
      if (deadlineReached() || (error instanceof Error && error.message === "NATIONAL_RAIN_DEADLINE")) {
        try {
          const outcome = await deferNationalRainJob(supabase, job.id, job.lease_token, finalSignal);
          if (outcome === "OK") result.deferred += 1;
        } catch {
          // Keep the row reclaimable via lease expiry if defer's outcome is ambiguous.
        }
        return;
      }
      try {
        const outcome = await finishNationalRainJob(
          supabase,
          job.id,
          job.lease_token,
          false,
          error instanceof Error ? error.message : String(error),
          finalSignal,
        );
        if (outcome === "OK") result.failed += 1;
      } catch {
        // Do not retry with another lease identity. The row remains safely fenced.
      }
    }
  };

  while (result.claimed < limit && now() + admissionMs < workDeadline && !signal.aborted) {
    const batchSize = Math.min(concurrency, limit - result.claimed);
    const jobs = (await claimNationalRainJobs(supabase, batchSize, signal)) as ClaimedNationalRainJob[];
    if (jobs.length === 0) break;
    if (jobs.some((job) => typeof job.lease_token !== "string" || job.lease_token.length === 0)) {
      throw new Error("Queue claim RPC returned a job without its lease identity");
    }
    result.claimed += jobs.length;

    const runnable: ClaimedNationalRainJob[] = [];
    for (const job of jobs) {
      if (deadlineReached()) {
        try {
          const outcome = await deferNationalRainJob(supabase, job.id, job.lease_token, finalSignal);
          if (outcome === "OK") result.deferred += 1;
        } catch {
          // Leave PROCESSING for the stale-lease reclaim path.
        }
      } else {
        runnable.push(job);
      }
    }
    await Promise.all(runnable.map(processJob));
  }

  return result;
}
