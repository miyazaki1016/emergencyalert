import { createClient } from "@supabase/supabase-js";
import { fetchObservationTargetTimes } from "../lib/weather/providers/jma/observationTargetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { openNationwidePixelMasks } from "../lib/weather/rain/lightRainPixelMaskLoader";
import {
  CASE_OBSERVATION_METHOD, collectCaseObservations, type ObservationMask,
} from "../lib/weather/rain/nationalRainCaseObservations";
import { forecastTime } from "../lib/weather/rain/nationalForecastSnapshot";

const MAX_LEAD_MS = 60 * 60_000;

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JMA_Z10_PIXEL_MASK_DIR } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JMA_Z10_PIXEL_MASK_DIR) {
    throw new Error("Case observation inputs are unavailable");
  }
  const deadline = AbortSignal.timeout(45_000);
  const targets = await fetchObservationTargetTimes((input, init) => fetch(input, {
    ...init, signal: AbortSignal.any([deadline, AbortSignal.timeout(5_000)]),
  }));
  const published = new Set(targets.map(t => t.validtime).filter(t => /^\d{14}$/.test(t) && Number.isFinite(forecastTime(t))));
  const latestObservation = Math.max(...[...published].map(forecastTime));
  if (!Number.isFinite(latestObservation)) throw new Error("No valid JMA observation times");
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: cases, error } = await db.from("national_rain_cases")
    .select("slug,municipality_code").eq("status", "ended").is("verification_summary", null)
    .lte("ended_at", new Date(latestObservation - MAX_LEAD_MS).toISOString())
    .or(`details_expire_at.is.null,details_expire_at.gt.${new Date().toISOString()}`)
    .order("ended_at").order("slug").limit(12).abortSignal(deadline);
  if (error) throw new Error("Could not read ended rain cases");
  if (!cases?.length) return;

  const masks = openNationwidePixelMasks(JMA_Z10_PIXEL_MASK_DIR, "20260101");
  const byCode = new Map<string, ObservationMask[]>(cases.map(row => [row.municipality_code, []]));
  for (const tile of masks.coordinates()) {
    deadline.throwIfAborted();
    for (const entry of masks.load(tile.x, tile.y).entries) {
      byCode.get(entry.code)?.push({ ...tile, mask: entry.mask });
    }
  }

  const cache = new Map<string, Promise<Buffer | null>>();
  function readTile(stamp: string, x: number, y: number) {
    const key = `${stamp}/${x}/${y}`;
    let request = cache.get(key);
    if (!request) {
      request = (async () => {
        const response = await fetch(buildJmaRainTileUrl({ basetime: stamp, validtime: stamp }, 10, x, y), {
          cache: "no-store", signal: AbortSignal.any([deadline, AbortSignal.timeout(5_000)]),
        });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`Observation tile HTTP ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
      })();
      cache.set(key, request);
    }
    return request;
  }

  for (const incident of cases) {
    if (deadline.aborted) break;
    try {
      const times = new Set<string>();
      let after: string | undefined;
      const pageSize = 100;
      while (true) {
        let query = db.from("national_rain_case_versions").select("base_time,slots")
          .eq("slug", incident.slug).order("base_time").limit(pageSize);
        if (after) query = query.gt("base_time", after);
        const { data, error: readError } = await query.abortSignal(deadline);
        if (readError) throw new Error("Could not read stored forecast times");
        for (const version of data) {
          for (const slot of version.slots as { validTime: string }[]) times.add(slot.validTime);
        }
        if (data.length < pageSize) break;
        after = data.at(-1)?.base_time;
      }
      if (!times.size || [...times].some(time => forecastTime(time) > latestObservation)) continue;
      const observations = await collectCaseObservations({
        validTimes: times, published, masks: byCode.get(incident.municipality_code) ?? [], readTile, signal: deadline,
      });
      const { error: writeError } = await db.rpc("verify_national_rain_case", {
        p_slug: incident.slug, p_method: CASE_OBSERVATION_METHOD, p_observations: observations,
      }).abortSignal(deadline);
      if (writeError) throw new Error(`Verification RPC failed: ${writeError.code}`);
      console.log(JSON.stringify({ event: "CASE_OBSERVATIONS", slug: incident.slug,
        available: Object.values(observations).filter(tier => tier !== null).length, total: times.size }));
    } catch (error) {
      console.warn(JSON.stringify({ event: "CASE_OBSERVATIONS_DEFERRED", slug: incident.slug,
        reason: error instanceof Error ? error.name : "Error" }));
    }
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.name : "CASE_OBSERVATIONS_FAILED");
  process.exitCode = 1;
});
