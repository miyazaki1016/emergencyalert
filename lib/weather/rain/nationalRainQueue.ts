import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type NationalRainQueueJob = {
  runKey: string;
  basetime: string;
  validtime: string;
  zoom: number;
  tileX: number;
  tileY: number;
  priority: number;
  scanWindow?: { minX: number; minY: number; maxX: number; maxY: number };
};

export function refinementJobFromCoarseCandidate(
  candidate: { tileX: number; tileY: number; pixelX: number; pixelY: number },
  frame: { basetime: string; validtime: string },
  coarseZoom = 4,
  refinementZoom: NationalRainRefinementStage = 10,
): NationalRainQueueJob {
  const [tile] = childTilesForCandidate(candidate, coarseZoom, refinementZoom);
  if (!tile) throw new Error("Candidate did not map to a refinement tile");
  return {
    runKey: `${frame.basetime}:${frame.validtime}`,
    basetime: frame.basetime,
    validtime: frame.validtime,
    zoom: refinementZoom,
    tileX: tile.tileX,
    tileY: tile.tileY,
    priority: 0,
    scanWindow: tile.scanWindow,
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

  const tiles: Array<{ zoom: NationalRainRefinementStage; tileX: number; tileY: number; scanWindow: { minX: number; minY: number; maxX: number; maxY: number } }> = [];
  for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
    for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      tiles.push({ zoom: childZoom, tileX, tileY, scanWindow: {
        minX: Math.max(0, minDetailWorldX - tileX * 256),
        minY: Math.max(0, minDetailWorldY - tileY * 256),
        maxX: Math.min(255, maxDetailWorldX - tileX * 256),
        maxY: Math.min(255, maxDetailWorldY - tileY * 256),
      } });
    }
  }
  return tiles;
}

export function stagedRefinementJobsFromCoarseCandidates(
  candidates: Array<{ tileX: number; tileY: number; pixelX: number; pixelY: number }>,
  frame: { basetime: string; validtime: string },
  childZoom: NationalRainRefinementStage = 6,
  coarseZoom = 4,
): NationalRainQueueJob[] {
  // Keep each parent-pixel lineage as its own job. Merging by tile alone loses
  // candidate windows when jobs arrive in separate worker batches.
  const byWindow = new Map<string, NationalRainQueueJob>();
  for (const candidate of candidates) {
    for (const tile of childTilesForCandidate(candidate, coarseZoom, childZoom)) {
      const job: NationalRainQueueJob = {
        runKey: `${frame.basetime}:${frame.validtime}`,
        basetime: frame.basetime,
        validtime: frame.validtime,
        zoom: tile.zoom,
        tileX: tile.tileX,
        tileY: tile.tileY,
        priority: 0,
        scanWindow: tile.scanWindow,
      };
      const w = tile.scanWindow;
      byWindow.set(`${job.zoom}:${job.tileX}:${job.tileY}:${w.minX}:${w.minY}:${w.maxX}:${w.maxY}`, job);
    }
  }
  return [...byWindow.values()];
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
    scan_min_x: job.scanWindow?.minX ?? 0,
    scan_min_y: job.scanWindow?.minY ?? 0,
    scan_max_x: job.scanWindow?.maxX ?? 255,
    scan_max_y: job.scanWindow?.maxY ?? 255,
    status: "PENDING",
  }));
}

export async function enqueueNationalRainJobs(supabase: SupabaseClient, jobs: NationalRainQueueJob[], signal?: AbortSignal) {
  if (jobs.length === 0) return { count: 0 };
  let query = supabase
    .from("national_rain_refinement_jobs")
    .upsert(queueRows(jobs), { onConflict: "run_key,validtime,zoom,tile_x,tile_y,scan_min_x,scan_min_y,scan_max_x,scan_max_y", ignoreDuplicates: true });
  if (signal && "abortSignal" in query) query = query.abortSignal(signal);
  const { error } = await query;
  if (error) throw error;
  return { count: jobs.length };
}

export async function claimNationalRainJobs(supabase: SupabaseClient, limit = 20, signal?: AbortSignal) {
  let query = supabase.rpc("claim_national_rain_refinement_jobs", { p_limit: limit });
  if (signal && "abortSignal" in query) query = query.abortSignal(signal);
  const { data, error } = await query;
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
  signal?: AbortSignal,
) {
  let query = supabase.from("national_rain_refinement_results").upsert({
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
  if (signal && "abortSignal" in query) query = query.abortSignal(signal);
  const { error } = await query;
  if (error) throw error;
}

export async function deferNationalRainJob(supabase: SupabaseClient, id: number, signal?: AbortSignal) {
  let query = supabase.rpc("defer_national_rain_refinement_job", { p_id: id });
  if (signal && "abortSignal" in query) query = query.abortSignal(signal);
  const { error } = await query;
  if (error) throw error;
}

export async function finishNationalRainJob(
  supabase: SupabaseClient,
  id: number,
  success: boolean,
  errorMessage?: string,
  signal?: AbortSignal,
) {
  let query = supabase.rpc("finish_national_rain_refinement_job", {
    p_id: id,
    p_success: success,
    p_error: errorMessage ?? null,
  });
  if (signal && "abortSignal" in query) query = query.abortSignal(signal);
  const { error } = await query;
  if (error) throw error;
}

export function createNationalRainQueueClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase service-role environment is required");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}


export async function getLastCompletedNationalRainBasetime(
  supabase: SupabaseClient,
  signal?: AbortSignal,
): Promise<string | null> {
  let query = supabase
    .from("national_rain_scan_cycles")
    .select("basetime")
    .eq("status", "COMPLETED")
    .order("basetime", { ascending: false })
    .limit(1)
    .maybeSingle();
  const abortableQuery = query as typeof query & { abortSignal?: (signal: AbortSignal) => typeof query };
  if (signal && typeof abortableQuery.abortSignal === "function") query = abortableQuery.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return data?.basetime ? String(data.basetime).replace(/[-:TZ.]/g, "").slice(0, 14) : null;
}

export async function saveNationalRainCycleState(
  supabase: SupabaseClient,
  state: {
    basetime: string;
    requiredFrames: number;
    usableFrames: number;
    completed: boolean;
  },
  signal?: AbortSignal,
) {
  let query = supabase.from("national_rain_scan_cycles").upsert({
    basetime: state.basetime,
    status: state.completed ? "COMPLETED" : "INCOMPLETE",
    required_frames: state.requiredFrames,
    usable_frames: state.usableFrames,
    completed_at: state.completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "basetime" });
  if (signal && "abortSignal" in query) query = query.abortSignal(signal);
  const { error } = await query;
  if (error) throw error;
}
