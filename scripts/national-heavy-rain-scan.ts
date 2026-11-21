import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { setTimeout as delay } from "node:timers/promises";
import { requireCompleteNationwideN03 } from "../lib/weather/rain/lightRainNationwideN03";
import { fetchForecastTargetTimes, type JmaTargetTime } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { locateJmaRainPixelsAtLeast1mm } from "../lib/weather/rain/lightRainProof";
import { municipalitiesForLightRainTile } from "../lib/weather/rain/lightRainMunicipalities";
import { matchHeavyRainPixelsToMasks } from "../lib/weather/rain/lightRainPixelMasks";
import { openNationwidePixelMasks } from "../lib/weather/rain/lightRainPixelMaskLoader";
import { forecastTime } from "../lib/weather/rain/nationalForecastSnapshot";
import { NATIONAL_FORECAST_WIDE_TILES, type ForecastTilePayload, type ForecastTileVersion } from "../lib/weather/rain/nationalForecastTiles";
import { affectedAdministrativeAreas, type AdministrativeArea } from "../lib/weather/rain/lightRainAdministrativeAreas";

const root = process.argv[2] ?? "";
if (!root) throw new Error("N03 root required");
const MAX_TILES = Number(process.env.Z10_MAX_TILES ?? "2500");
if (!Number.isInteger(MAX_TILES) || MAX_TILES < 1) throw new Error("Invalid Z10 tile budget");
const maskDir = process.env.JMA_Z10_PIXEL_MASK_DIR ?? "";
if (!maskDir) throw new Error("JMA_Z10_PIXEL_MASK_DIR is required");
const N03_VERSION = "20260101";
const pixelMasks = openNationwidePixelMasks(maskDir, N03_VERSION);
const MINUTE = 60_000;
const CYCLE_BUDGET_MS = 4 * MINUTE;
const TABLE = "national_rain_forecast_tile_versions";
const utcStamp = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace(/[-:T]/g, "");
const lon=(x:number,z:number)=>x/(2**z)*360-180;
const lat=(y:number,z:number)=>Math.atan(Math.sinh(Math.PI-2*Math.PI*y/(2**z)))*180/Math.PI;
function bbox(area:AdministrativeArea):[number,number,number,number]{
  const polys=area.geometry.type==="Polygon"?[area.geometry.coordinates as number[][][]]:area.geometry.coordinates as number[][][][];
  let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;
  for(const p of polys)for(const ring of p)for(const [x,y]of ring){w=Math.min(w,x);s=Math.min(s,y);e=Math.max(e,x);n=Math.max(n,y);}
  return [w,s,e,n];
}
const xy=(longitude:number,latitude:number,z:number):[number,number]=>{
  const safe=Math.max(-85.05112878,Math.min(85.05112878,latitude));
  const rad=safe*Math.PI/180;
  return [Math.floor((longitude+180)/360*2**z),Math.floor((1-Math.asinh(Math.tan(rad))/Math.PI)/2*2**z)];
};
function limitParallelism(maximum: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async function run<T>(work: () => Promise<T>): Promise<T> {
    if (active < maximum) active++;
    else await new Promise<void>(resolve => waiting.push(resolve));
    try {
      return await work();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}

const z10Concurrency = Number(process.env.JMA_Z10_CONCURRENCY ?? "4");
if (![4, 8].includes(z10Concurrency)) throw new Error("JMA_Z10_CONCURRENCY must be 4 or 8");
const runTileRequest = limitParallelism(2 * z10Concurrency);
const runWideRequest = limitParallelism(2);

async function fetchTile(frame:{basetime:string;validtime:string},z:number,x:number,y:number, signal:AbortSignal){
  const url=buildJmaRainTileUrl(frame,z,x,y);
  const attempts: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    const started = performance.now();
    let outcome = "transport_error";
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]) });
      const headersMs = Math.round(performance.now()-started);
      outcome = "HTTP_" + response.status;
      if (response.ok) {
        const bytes = Buffer.from(await response.arrayBuffer());
        const bodyDoneMs = Math.round(performance.now()-started);
        outcome = "ok";
        console.log(JSON.stringify({event:"JMA_TILE_FETCH",basetime:frame.basetime,validtime:frame.validtime,z,x,y,attempt:attempt+1,outcome:"ok",httpStatus:response.status,headersMs,bodyMs:bodyDoneMs-headersMs,elapsedMs:bodyDoneMs,bytes:bytes.length,cacheStatus:response.headers.get("x-cache")}));
        return bytes;
      }
      if (response.body) await response.body.cancel().catch(() => undefined);
      if (response.status === 404) return null;
      attempts.push("HTTP " + response.status);
      if (![408, 429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      outcome = signal.aborted ? "slot_deadline_abort" : error instanceof Error ? error.name : "TransportError";
      attempts.push(outcome);
    } finally {
      if (outcome !== "ok") {
        console.log(JSON.stringify({event:"JMA_TILE_FETCH",basetime:frame.basetime,validtime:frame.validtime,z,x,y,attempt:attempt+1,outcome,elapsedMs:Math.round(performance.now()-started)}));
      }
    }
    if (attempt < 1) await delay(500, undefined, { signal });
  }
  throw new Error(`INCOMPLETE_JMA_TILE ${url} attempts: ${attempts.join(", ")}`);
}
function plannedDetailTiles(buffer: Buffer, x: number, y: number, indexed: IndexedArea[]) {
  const bounds = [lon(x, 4), lat(y + 1, 4), lon(x + 1, 4), lat(y, 4)];
  const relevant = indexed.filter(({ b }) => b[0] <= bounds[2] && b[2] >= bounds[0]
    && b[1] <= bounds[3] && b[3] >= bounds[1]).map(({ area }) => area);
  const pixels = locateJmaRainPixelsAtLeast1mm(buffer, 4, x, y);
  if (!pixels.length) return new Map<string, DetailTile>();
  const areas = new Map(relevant.map(area => [area.code, area]));
  const candidates = municipalitiesForLightRainTile(buffer, 4, x, y, relevant);
  const rainyTiles = new Map<string, { x: number; y: number }>();
  for (const { pixelX, pixelY } of pixels) {
    const tileX = x * 64 + Math.floor(pixelX / 4);
    const tileY = y * 64 + Math.floor(pixelY / 4);
    rainyTiles.set(`${tileX}/${tileY}`, { x: tileX, y: tileY });
  }
  const planned = new Map<string, DetailTile>();
  for (const candidate of candidates) {
    const area = areas.get(candidate.code)!;
    const [w, s, e, n] = bbox(area);
    const [minX, minY] = xy(w, n, 10), [maxX, maxY] = xy(e, s, 10);
    for (const [key, tile] of rainyTiles) {
      if (tile.x < minX || tile.x > maxX || tile.y < minY || tile.y > maxY) continue;
      const entry = planned.get(key) ?? { ...tile, areas: [] };
      entry.areas.push(area);
      planned.set(key, entry);
    }
  }
  return planned;
}

type IndexedArea = { area: AdministrativeArea; b: ReturnType<typeof bbox> };
type DetailTile = { x: number; y: number; areas: AdministrativeArea[] };

async function scanDetail(frame: JmaTargetTime, tile: DetailTile, signal: AbortSignal) {
  const { x, y, areas } = tile;
  const buffer = await runTileRequest(() => fetchTile(frame, 10, x, y, signal));
  if (!buffer) return null;
  const pixels = locateJmaRainPixelsAtLeast1mm(buffer, 10, x, y);
  const unlistedAndDisjoint = pixels.length > 0 && !pixelMasks.has(x, y)
    && !affectedAdministrativeAreas([{ coordinates: [[
      [lon(x, 10), lat(y, 10)], [lon(x + 1, 10), lat(y, 10)],
      [lon(x + 1, 10), lat(y + 1, 10)], [lon(x, 10), lat(y + 1, 10)],
    ]] }], areas).length;
  const municipalities = pixels.length && !unlistedAndDisjoint
    ? matchHeavyRainPixelsToMasks(pixels, x, y, pixelMasks.load(x, y), areas)
    : [];
  return municipalities.map(area => ({ ...area, radarTile: { x, y } }));
}

async function scanRegion(row: ForecastTileVersion, indexed: IndexedArea[], signal: AbortSignal) {
  const { x, y, payload } = row;
  const frame = { basetime: row.base_time, validtime: row.valid_time, elements: ["hrpns"] };
  const buffer = await runWideRequest(() => runTileRequest(() => fetchTile(frame, 4, x, y, signal)));
  if (!buffer) return null;
  const plan = plannedDetailTiles(buffer, x, y, indexed);
  const tiles = { ...payload?.tiles };
  if (payload) {
    // The same JMA version has the same coverage plan. Treat any previously
    // unresolved child as unknown until its own tile can be decoded.
    for (const key of payload.pending) {
      if (!plan.has(key)) {
        const [x, y] = key.split("/").map(Number);
        plan.set(key, { x, y, areas: indexed.filter(({ b }) =>
          b[0] <= lon(x + 1, 10) && b[2] >= lon(x, 10)
          && b[1] <= lat(y, 10) && b[3] >= lat(y + 1, 10)).map(({ area }) => area) });
      }
    }
  }
  const jobs = [...plan].filter(([key]) => !(key in tiles));
  const result: ForecastTilePayload = { pending: jobs.map(([key]) => key), tiles };
  const attempts = jobs.slice(0, MAX_TILES);
  for (let offset = 0; offset < attempts.length && !signal.aborted; offset += z10Concurrency) {
    const batch = attempts.slice(offset, offset + z10Concurrency);
    const outcomes = await Promise.allSettled(batch.map(([, tile]) => scanDetail(frame, tile, signal)));
    for (const [index, outcome] of outcomes.entries()) {
      if (outcome.status === "fulfilled" && outcome.value !== null) {
        const [key] = batch[index];
        tiles[key] = outcome.value;
      }
    }
  }
  result.pending = result.pending.filter(key => !(key in tiles));
  return result;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing forecast storage credentials");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const now = Date.now();
  const stamp = utcStamp(now);
  const { error: cleanupError } = await db.from(TABLE).delete().lt("valid_time", utcStamp(now - 24 * 60 * MINUTE));
  if (cleanupError) throw new Error("FORECAST_TILE_CLEANUP_FAILED");

  const timeIndexSignal = AbortSignal.timeout(15_000);
  let targets: JmaTargetTime[];
  try {
    targets = await fetchForecastTargetTimes((input, init) => fetch(input, { ...init, signal: timeIndexSignal }));
  } catch (error) {
    console.error("FORECAST_TARGET_INDEX_UNAVAILABLE", error);
    targets = [];
  }
  const newRows = new Map<string, ForecastTileVersion>();
  for (const { basetime, validtime } of targets) {
    if (!/^\d{14}$/.test(basetime) || !/^\d{14}$/.test(validtime)) continue;
    const base = forecastTime(basetime);
    const valid = forecastTime(validtime);
    const lead = (valid - base) / MINUTE;
    if (!(base <= now && valid > now && lead >= 5 && lead <= 60 && lead % 5 === 0)) continue;
    for (const [x, y] of NATIONAL_FORECAST_WIDE_TILES) {
      const row = { base_time: basetime, valid_time: validtime, extended: lead > 30, x, y, payload: null };
      newRows.set(`${validtime}/${basetime}/${x}/${y}`, row);
    }
  }
  if (newRows.size) {
    const { error } = await db.from(TABLE).upsert([...newRows.values()], { ignoreDuplicates: true });
    if (error) throw new Error("FORECAST_TILE_QUEUE_WRITE_FAILED");
  }
  const { data, error } = await db.from(TABLE)
    .select("valid_time,base_time,extended,x,y,payload").gt("valid_time", stamp)
    .order("base_time", { ascending: false }).order("valid_time");
  if (error) throw new Error("FORECAST_TILE_QUEUE_READ_FAILED");

  const coverage = requireCompleteNationwideN03(root);
  const manifest = JSON.parse(readFileSync(maskDir + "/manifest.json", "utf8"));
  if (manifest.municipalities !== coverage.municipalities) throw new Error("N03_LRPM_COVERAGE_MISMATCH");
  const indexed = coverage.areas.map(area => ({ area, b: bbox(area) }));
  const cycleSignal = AbortSignal.timeout(Math.max(1, CYCLE_BUDGET_MS - (Date.now() - now)));
  const runRegion = limitParallelism(2);
  const complete = new Set<string>();
  const work = new Map<string, ForecastTileVersion[]>();
  for (const row of data as ForecastTileVersion[]) {
    const region = `${row.valid_time}/${row.extended}/${row.x}/${row.y}`;
    if (complete.has(region)) continue;
    if (row.payload && !row.payload.pending.length) {
      complete.add(region);
      continue;
    }
    const versions = work.get(region) ?? [];
    versions.push(row);
    work.set(region, versions);
  }
  // Attempt one version per region in each pass so old retries do not block first reads.
  const regions = [...work.entries()];
  let failures = 0;
  let writes = 0;
  for (let pass = 0; regions.some(([, versions]) => versions.length > pass) && !cycleSignal.aborted; pass++) {
    const satisfied = new Set<string>();
    await Promise.all(regions.map(([region, versions]) => runRegion(async () => {
      const row = versions[pass];
      if (!row || cycleSignal.aborted || forecastTime(row.valid_time) <= Date.now()) return;
      const signal = AbortSignal.any([cycleSignal, AbortSignal.timeout(Math.max(1, forecastTime(row.valid_time) - Date.now()))]);
      let payload: ForecastTilePayload | null;
      try {
        payload = await scanRegion(row, indexed, signal);
      } catch (error) {
        failures++;
        console.error("FORECAST_REGION_SCAN_FAILED", row.base_time, row.valid_time, row.x, row.y, error);
        return;
      }
      if (!payload || forecastTime(row.valid_time) <= Date.now()) return;
      const { error } = await db.from(TABLE).update({ payload, updated_at: new Date().toISOString() })
        .match({ base_time: row.base_time, valid_time: row.valid_time, extended: row.extended, x: row.x, y: row.y })
        .abortSignal(AbortSignal.timeout(8_000));
      if (error) {
        failures++;
        console.error("FORECAST_TILE_WRITE_FAILED", row.base_time, row.valid_time, row.x, row.y, error.code);
        return;
      }
      writes++;
      if (!payload.pending.length) satisfied.add(region);
      console.log(JSON.stringify({ event: "FORECAST_REGION_UPDATED", base: row.base_time, valid: row.valid_time,
        x: row.x, y: row.y, pending: payload.pending.length, detailTiles: Object.keys(payload.tiles).length }));
    })));
    for (const [region, versions] of regions) if (satisfied.has(region)) versions.length = 0;
  }
  console.log(JSON.stringify({ event: "FORECAST_TILE_CYCLE", writes, failures, budgetExpired: cycleSignal.aborted }));
  if (failures || (!writes && (!targets.length || regions.some(([, versions]) => versions.length)))) {
    throw new Error("NO_FORECAST_TILE_UPDATES");
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "FORECAST_SCAN_FAILED");
  process.exitCode = 1;
});
