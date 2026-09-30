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
  refinementZoom = 8,
): NationalRainQueueJob {
  const scale = 2 ** (refinementZoom - coarseZoom);
  if (scale !== 16) throw new Error("Unsupported national rain refinement zoom ratio");
  const tileX = candidate.tileX * scale + Math.floor(candidate.pixelX / 16);
  const tileY = candidate.tileY * scale + Math.floor(candidate.pixelY / 16);
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
