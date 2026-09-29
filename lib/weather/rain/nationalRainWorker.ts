import { SupabaseClient } from "@supabase/supabase-js";
import { PNG } from "pngjs";
import { buildJmaRainTileUrl } from "../providers/jma/tileUrl";
import { heavyRainAreaPolygons, scanHeavyRainTile } from "./nationalHeavyRain";
import { claimNationalRainJobs, finishNationalRainJob, saveNationalRainRefinementResult } from "./nationalRainQueue";
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
};

export async function processNationalRainRefinementJobs(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    fetcher?: typeof fetch;
    resolveMunicipalities?: (footprint: ReturnType<typeof heavyRainAreaPolygons>) => Promise<NationalRainMunicipality[]>;
  } = {},
): Promise<NationalRainWorkerResult> {
  const fetcher = options.fetcher ?? fetch;
  const jobs = (await claimNationalRainJobs(supabase, options.limit ?? 10)) as ClaimedNationalRainJob[];
  const result: NationalRainWorkerResult = { claimed: jobs.length, done: 0, failed: 0, strongPixels: 0 };

  for (const job of jobs) {
    try {
      const response = await fetcher(
        buildJmaRainTileUrl({ basetime: job.basetime, validtime: job.validtime }, job.zoom, job.tile_x, job.tile_y),
      );
      if (!response.ok) throw new Error(`JMA tile fetch failed: ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      PNG.sync.read(buffer);
      const strongCandidates = scanHeavyRainTile(buffer, job.zoom, job.tile_x, job.tile_y, 1);
      const strongPixelCount = strongCandidates.length;
      const footprint = heavyRainAreaPolygons(strongCandidates, job.zoom);
      if (options.resolveMunicipalities) await options.resolveMunicipalities(footprint);
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
      });
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
  }

  return result;
}
