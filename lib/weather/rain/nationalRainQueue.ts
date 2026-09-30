import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type NationalRainQueueJob = {
  runKey: string;
  basetime: string;
  validtime: string;
  zoom: number;
  tileX: number;
  tileY: number;
  priority: number;
};

export function refinementJobFromCoarseCandidate(
  candidate: { tileX: number; tileY: number; pixelX: number; pixelY: number },
  frame: { basetime: string; validtime: string },
  coarseZoom = 4,
  refinementZoom = 10,
): NationalRainQueueJob {
  const scale = 2 ** (refinementZoom - coarseZoom);
  if (!Number.isInteger(scale) || scale < 1 || scale > 256 || 256 % scale !== 0) {
    throw new Error("Unsupported national rain refinement zoom ratio");
  }
  const coarsePixelsPerRefinementTile = 256 / scale;
  const tileX = candidate.tileX * scale + Math.floor(candidate.pixelX / coarsePixelsPerRefinementTile);
  const tileY = candidate.tileY * scale + Math.floor(candidate.pixelY / coarsePixelsPerRefinementTile);
  return {
    runKey: `${frame.basetime}:${frame.validtime}`,
    basetime: frame.basetime,
    validtime: frame.validtime,
    zoom: refinementZoom,
    tileX,
    tileY,
    priority: 0,
  };
}

export type NationalRainRefinementStage = 6 | 8 | 10;

export function childTilesForCandidate(
  candidate: { tileX: number; tileY: number; pixelX: number; pixelY: number },
  coarseZoom: number,
  childZoom: NationalRainRefinementStage,
) {
  const scale = 2 ** (childZoom - coarseZoom);
  if (!Number.isInteger(scale) || scale < 1 || scale > 256 || 256 % scale !== 0) {
    throw new Error("Unsupported national rain refinement zoom ratio");
  }

  // One coarse pixel spans scale detail pixels. Convert that exact world-pixel
  // rectangle to every child tile it intersects. At z4 -> z6 this is a 4x4
  // detail-pixel area, normally contained by one z6 tile; boundary pixels can
  // touch adjacent tiles, so derive the tile bounds instead of assuming one.
  const coarseWorldX = candidate.tileX * 256 + candidate.pixelX;
  const coarseWorldY = candidate.tileY * 256 + candidate.pixelY;
  const minDetailWorldX = coarseWorldX * scale;
  const minDetailWorldY = coarseWorldY * scale;
  const maxDetailWorldX = (coarseWorldX + 1) * scale - 1;
  const maxDetailWorldY = (coarseWorldY + 1) * scale - 1;
  const minTileX = Math.floor(minDetailWorldX / 256);
  const minTileY = Math.floor(minDetailWorldY / 256);
  const maxTileX = Math.floor(maxDetailWorldX / 256);
  const maxTileY = Math.floor(maxDetailWorldY / 256);

  const tiles: Array<{ zoom: NationalRainRefinementStage; tileX: number; tileY: number }> = [];
  for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
    for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      tiles.push({ zoom: childZoom, tileX, tileY });
    }
  }
  return tiles;
}

export function stagedRefinementJobsFromCoarseCandidates(
  candidates: Array<{ tileX: number; tileY: number; pixelX: number; pixelY: number }>,
  frame: { basetime: string; validtime: string },
  childZoom: NationalRainRefinementStage = 6,
): NationalRainQueueJob[] {
  const byTile = new Map<string, NationalRainQueueJob>();
  for (const candidate of candidates) {
    for (const tile of childTilesForCandidate(candidate, 4, childZoom)) {
      const job: NationalRainQueueJob = {
        runKey: `${frame.basetime}:${frame.validtime}`,
        basetime: frame.basetime,
        validtime: frame.validtime,
        zoom: tile.zoom,
        tileX: tile.tileX,
        tileY: tile.tileY,
        priority: 0,
      };
      byTile.set(`${job.zoom}:${job.tileX}:${job.tileY}`, job);
    }
  }
  return [...byTile.values()];
}

export function queueRows(jobs: NationalRainQueueJob[]) {
  return jobs.map((job) => ({
    run_key: job.runKey,
    basetime: job.basetime,
    validtime: job.validtime,
    zoom: job.zoom,
    tile_x: job.tileX,
    tile_y: job.tileY,
    priority: job.priority,
    status: "PENDING",
  }));
}

export async function enqueueNationalRainJobs(supabase: SupabaseClient, jobs: NationalRainQueueJob[]) {
  if (jobs.length === 0) return { count: 0 };
  const { error } = await supabase
    .from("national_rain_refinement_jobs")
    .upsert(queueRows(jobs), { onConflict: "run_key,validtime,zoom,tile_x,tile_y", ignoreDuplicates: true });
  if (error) throw error;
  return { count: jobs.length };
}

export async function claimNationalRainJobs(supabase: SupabaseClient, limit = 20) {
  const { data, error } = await supabase.rpc("claim_national_rain_refinement_jobs", { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}


export async function saveNationalRainRefinementResult(
  supabase: SupabaseClient,
  result: {
    jobId: number;
    runKey: string;
    basetime: string;
    validtime: string;
    zoom: number;
    tileX: number;
    tileY: number;
    strongPixelCount: number;
    footprint?: unknown[];
    municipalities?: unknown[];
  },
) {
  const { error } = await supabase.from("national_rain_refinement_results").upsert({
    job_id: result.jobId,
    run_key: result.runKey,
    basetime: result.basetime,
    validtime: result.validtime,
    zoom: result.zoom,
    tile_x: result.tileX,
    tile_y: result.tileY,
    strong_pixel_count: result.strongPixelCount,
    footprint: result.footprint ?? [],
    municipalities: result.municipalities ?? [],
    updated_at: new Date().toISOString(),
  }, { onConflict: "job_id" });
  if (error) throw error;
}

export async function deferNationalRainJob(supabase: SupabaseClient, id: number) {
  const { error } = await supabase.rpc("defer_national_rain_refinement_job", { p_id: id });
  if (error) throw error;
}

export async function finishNationalRainJob(
  supabase: SupabaseClient,
  id: number,
  success: boolean,
  errorMessage?: string,
) {
  const { error } = await supabase.rpc("finish_national_rain_refinement_job", {
    p_id: id,
    p_success: success,
    p_error: errorMessage ?? null,
  });
  if (error) throw error;
}

export function createNationalRainQueueClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase service-role environment is required");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
