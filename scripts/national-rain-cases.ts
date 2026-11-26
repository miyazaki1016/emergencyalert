import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { caseStamp, planNationalRainCaseVersion } from "../lib/weather/rain/nationalRainCases";
import type { ForecastTileVersion } from "../lib/weather/rain/nationalForecastTiles";

async function main() {
  const [mode, slug, evidencePath] = process.argv.slice(2);
  if (mode !== "ingest" && !(mode === "verify" && slug && evidencePath)) {
    throw new Error("Usage: national-rain-cases.ts ingest | verify <slug> <radar-observations.json>");
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing case storage credentials");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const deadline = AbortSignal.timeout(30_000);
  if (mode === "verify") {
    const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
    const { error } = await db.rpc("verify_national_rain_case", {
      p_slug: slug, p_method: evidence.method, p_observations: evidence.observations,
    }).abortSignal(deadline);
    if (error) throw new Error(`CASE_VERIFICATION_FAILED: ${error.code}`);
    return;
  }

  const now = Date.now();
  const { data, error } = await db.from("national_rain_forecast_tile_versions")
    .select("valid_time,base_time,extended,x,y,payload")
    .gt("valid_time", caseStamp(now)).lte("base_time", caseStamp(now))
    .order("valid_time").order("base_time").order("extended").order("x").order("y")
    .limit(1000).abortSignal(deadline);
  if (error || !data || data.length === 1000) throw new Error("CASE_FORECAST_READ_INCOMPLETE");
  const planned = planNationalRainCaseVersion(data as ForecastTileVersion[], now);
  if (!planned) return;
  const saved = await db.rpc("ingest_national_rain_case_version", planned).abortSignal(deadline);
  if (saved.error) throw new Error(`CASE_INGEST_FAILED: ${saved.error.code}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "CASE_STEP_FAILED");
  process.exitCode = 1;
});
