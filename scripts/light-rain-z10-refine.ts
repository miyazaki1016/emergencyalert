/** Read-only z10 verification of nationwide z4 municipality candidates.
 * Fail closed when the requested candidate set exceeds the tile budget.
 * Usage: npx tsx scripts/light-rain-z10-refine.ts <47-N03-root>
 */
import { setTimeout as delay } from "node:timers/promises";
import { requireCompleteNationwideN03 } from "../lib/weather/rain/lightRainNationwideN03";
import { fetchForecastTargetTimes, type JmaTargetTime } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { locateJmaRainPixelsAtLeast1mm, scanJmaTileAtLeast1mm } from "../lib/weather/rain/lightRainProof";
import { municipalitiesForLightRainTile } from "../lib/weather/rain/lightRainMunicipalities";
import { forecastTime } from "../lib/weather/rain/nationalForecastSnapshot";
import type { AdministrativeArea } from "../lib/weather/rain/lightRainAdministrativeAreas";

const root=process.argv[2];
if(!root)throw new Error("N03 root required");
const MAX_TILES=Number(process.env.Z10_MAX_TILES||"2500");
const tiles4=[[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
const FIVE_MINUTES = 300_000;
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
async function fetchTile(frame:{basetime:string;validtime:string},z:number,x:number,y:number, signal:AbortSignal){
  const url=buildJmaRainTileUrl(frame,z,x,y);
  const attempts: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    const started = performance.now();
    let outcome = "transport_error";
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]) });
      outcome = "HTTP_" + response.status;
      if (response.ok) {
        const bytes = Buffer.from(await response.arrayBuffer());
        console.log(JSON.stringify({event:"JMA_TILE_FETCH",basetime:frame.basetime,validtime:frame.validtime,z,x,y,attempt:attempt+1,outcome:"ok",httpStatus:response.status,elapsedMs:Math.round(performance.now()-started),bytes:bytes.length}));
        return bytes;
      }
      attempts.push("HTTP " + response.status);
      if (![404, 408, 429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      outcome = error instanceof Error ? error.name : "TransportError";
      attempts.push(outcome);
    } finally {
      if (outcome !== "HTTP_200" && outcome !== "ok") {
        console.log(JSON.stringify({event:"JMA_TILE_FETCH",basetime:frame.basetime,validtime:frame.validtime,z,x,y,attempt:attempt+1,outcome,elapsedMs:Math.round(performance.now()-started)}));
      }
    }
    if (attempt < 1) await delay(500, undefined, { signal });
  }
  throw new Error(`INCOMPLETE_JMA_TILE ${url} attempts: ${attempts.join(", ")}`);
}
function selectFrames(targets: JmaTargetTime[], now: number): JmaTargetTime[] {
  const basetime = targets
    .map(frame => frame.basetime)
    .filter(base => forecastTime(base) <= now && now - forecastTime(base) < 2 * FIVE_MINUTES)
    .sort().at(-1);
  if (!basetime) throw new Error("NO_FRESH_JMA_BASETIME");
  const base = forecastTime(basetime);
  const frames = targets.filter(frame => frame.basetime === basetime
    && forecastTime(frame.validtime) > base && forecastTime(frame.validtime) <= base + 6 * FIVE_MINUTES);
  if (frames.length !== 6 || frames.some((frame, i) => forecastTime(frame.validtime) !== base + (i + 1) * FIVE_MINUTES)) {
    throw new Error("INCOMPLETE_JMA_FRAMES: expected six consecutive forecast frames from one basetime");
  }
  return frames;
}

async function refineFrame(
  frame: JmaTargetTime,
  indexed: Array<{ area: AdministrativeArea; b: ReturnType<typeof bbox> }>,
  areaByCode: Map<string, AdministrativeArea>,
  signal: AbortSignal,
) {
  const started = performance.now();
  const candidates = new Map<string, AdministrativeArea>();
  const rainyZ10Tiles = new Map<string, { x: number; y: number }>();
  for (const [x, y] of tiles4) {
    const bounds = [lon(x, 4), lat(y + 1, 4), lon(x + 1, 4), lat(y, 4)];
    const relevant = indexed.filter(({ b }) => b[0] <= bounds[2] && b[2] >= bounds[0]
      && b[1] <= bounds[3] && b[3] >= bounds[1]).map(({ area }) => area);
    const buffer = await fetchTile(frame, 4, x, y, signal);
    const pixels = locateJmaRainPixelsAtLeast1mm(buffer, 4, x, y);
    if (!pixels.length) continue;
    for (const area of municipalitiesForLightRainTile(buffer, 4, x, y, relevant)) {
      candidates.set(area.code, areaByCode.get(area.code)!);
    }
    // Each z4 PNG pixel spans 1/4 of a z10 tile and the grids share an origin.
    for (const { pixelX, pixelY } of pixels) {
      const tileX = x * 64 + Math.floor(pixelX / 4);
      const tileY = y * 64 + Math.floor(pixelY / 4);
      rainyZ10Tiles.set(tileX + "/" + tileY, { x: tileX, y: tileY });
    }
  }
  const z4Done = performance.now();
  const tileMap = new Map<string, { x: number; y: number; areas: AdministrativeArea[] }>();
  for (const area of candidates.values()) {
    const [w, s, e, n] = bbox(area);
    const [minX, minY] = xy(w, n, 10), [maxX, maxY] = xy(e, s, 10);
    for (const [key, { x, y }] of rainyZ10Tiles) {
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      const entry = tileMap.get(key) ?? { x, y, areas: [] };
      entry.areas.push(area);
      tileMap.set(key, entry);
    }
  }
  if (tileMap.size > MAX_TILES) {
    throw new Error(`Z10_TILE_BUDGET_EXCEEDED: ${tileMap.size} > ${MAX_TILES}; no partial result accepted`);
  }
  const tilePlanDone=performance.now();
  const matched=new Map<string,{code:string;prefecture:string;municipality:string}>();
  let z10NetworkMs=0,z10MatchingMs=0;
  const entries=[...tileMap.values()];
  let rainyTiles=0;
  for(let i=0;i<entries.length;i+=8){
    signal.throwIfAborted();
    const batch=entries.slice(i,i+8);
    const outcomes=await Promise.allSettled(batch.map(async t=>{
      const fetchStart=performance.now();
      const buffer=await fetchTile(frame,10,t.x,t.y,signal);
      const fetchMs=performance.now()-fetchStart;
      const matchStart=performance.now();
      const scan=scanJmaTileAtLeast1mm(buffer);
      if(scan.unknownPixels)throw new Error("UNKNOWN_JMA_PIXEL_Z10 "+t.x+"/"+t.y);
      const municipalities=scan.rainPixels?municipalitiesForLightRainTile(buffer,10,t.x,t.y,t.areas):[];
      return {scan,municipalities,fetchMs,matchingMs:performance.now()-matchStart};
    }));
    for (const outcome of outcomes) {
      if (outcome.status === "rejected") throw outcome.reason;
      const { scan, municipalities, fetchMs, matchingMs } = outcome.value;
      z10NetworkMs += fetchMs;
      z10MatchingMs += matchingMs;
      if (scan.rainPixels) rainyTiles++;
      for (const area of municipalities) matched.set(area.code, area);
    }
  }
  const z10Done=performance.now();
  const round=(n:number)=>Math.round(n);
  const timingMs={z4ScanAndCandidateMatch:round(z4Done-started),z10TilePlanning:round(tilePlanDone-z4Done),z10WallClock:round(z10Done-tilePlanDone),z10NetworkCumulative:round(z10NetworkMs),z10DecodeAndMunicipalityMatchCumulative:round(z10MatchingMs),total:round(z10Done-started)};
  return {
    validtime: frame.validtime,
    timingMs,
    z4Candidates: candidates.size,
    z10TilesChecked: entries.length,
    z10RainyTiles: rainyTiles,
    z10Municipalities: matched.size,
    municipalities: [...matched.values()].sort((a, b) => a.code.localeCompare(b.code)),
  };
}

async function main() {
  const started = performance.now();
  const coverage = requireCompleteNationwideN03(root);
  const indexed = coverage.areas.map(area => ({ area, b: bbox(area) }));
  const areaByCode = new Map(coverage.areas.map(area => [area.code, area]));
  const n03LoadAndIndex = Math.round(performance.now() - started);
  let previousBase: string | undefined;
  let successfulUpdates = 0;
  // A successful watch is not evidence of uninterrupted five-minute coverage.
  // Keep gaps visible and fail the read-only audit rather than silently skipping them.
  const missingBasetimes: string[] = [];
  const observedBasetimes = new Set<string>();
  const recordGap = (base: string) => {
    if (observedBasetimes.has(base)) return;
    observedBasetimes.add(base);
    if (!previousBase) return;
    const from = forecastTime(previousBase);
    const to = forecastTime(base);
    if (to <= from) return;
    for (let t = from + FIVE_MINUTES; t < to; t += FIVE_MINUTES) {
      const missing = new Date(t).toISOString();
      missingBasetimes.push(missing);
      console.error(JSON.stringify({ event: "MISSING_JMA_BASETIME", basetime: missing, nextBasetime: base, recovered: false, publication: false }));
    }
  };
  const update = async () => {
    const scanStarted = performance.now();
    // Stop this slot before the next JMA publication window; never recover old slots.
    const slotEnd = Math.floor(Date.now() / FIVE_MINUTES) * FIVE_MINUTES + FIVE_MINUTES + 90_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("JMA_SLOT_DEADLINE_EXCEEDED")), Math.max(0, slotEnd - Date.now()));
    try {
    // Poll only the lightweight target-time index when the expected cycle is
    // not yet published. Never rescan old tiles or overlap an active scan.
    const expectedBaseMs = Math.floor(Date.now() / FIVE_MINUTES) * FIVE_MINUTES;
    const pollUntil = expectedBaseMs + 4 * 60_000;
    let frames: JmaTargetTime[] | undefined;
    while (!controller.signal.aborted) {
      const checkedAt = new Date().toISOString();
      const targets = await fetchForecastTargetTimes((input, init) =>
        fetch(input, { ...init, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) }));
      const newestBase = targets.map(target => target.basetime).sort().at(-1);
      console.log(JSON.stringify({ event: "JMA_TARGET_TIME_CHECK", checkedAt, expectedBase: new Date(expectedBaseMs).toISOString(), newestBase, previousBase, publication: false }));
      if (newestBase && forecastTime(newestBase) >= expectedBaseMs && newestBase !== previousBase) {
        frames = selectFrames(targets, Date.now());
        break;
      }
      if (Date.now() + 30_000 > pollUntil) {
        console.error(JSON.stringify({ event: "JMA_TARGET_TIME_NOT_READY", expectedBase: new Date(expectedBaseMs).toISOString(), newestBase, publication: false }));
        return;
      }
      await delay(30_000, undefined, { signal: controller.signal });
    }
    controller.signal.throwIfAborted();
    if (!frames) return;
    const results = [];
    // Two frames share the cycle budget. Await both before stopping so the next
    // update does not overlap a failed cycle's remaining requests.
    for (let i = 0; i < frames.length; i += 2) {
      const batch = await Promise.allSettled(
        frames.slice(i, i + 2).map(frame => refineFrame(frame, indexed, areaByCode, controller.signal)),
      );
      for (const result of batch) {
        if (result.status === "rejected") throw result.reason;
        results.push(result.value);
      }
    }

    if (Date.now() - forecastTime(frames[0].basetime) >= 2 * FIVE_MINUTES) {
      throw new Error("JMA forecast expired before the scan finished");
    }
    console.log(JSON.stringify({
      mode: "READ_ONLY_Z10_REAL_JMA_N03",
      basetime: frames[0].basetime,
      checkedAt: new Date().toISOString(),
      baseAgeMs: Date.now() - forecastTime(frames[0].basetime),
      prefectures: coverage.prefectures,
      municipalityDatasetSize: coverage.municipalities,
      thresholdMmPerHour: 1,
      timingMs: { n03LoadAndIndex, total: Math.round(n03LoadAndIndex + performance.now() - scanStarted) },
      frames: results,
      publication: false,
      productionWrites: false,
      blueskyPosts: false,
    }));
    // Record a gap only after the new cycle has actually completed. A failed
    // cycle must not be mistaken for successful progress.
    recordGap(frames[0].basetime);
    previousBase = frames[0].basetime;
    successfulUpdates++;
    } finally { clearTimeout(timer); }
  };

  if (!process.argv.includes("--watch")) return update();
  const watchCount = Number(process.env.JMA_WATCH_SUCCESS_COUNT || "0");
  if (!Number.isSafeInteger(watchCount) || watchCount < 0) throw new Error("Invalid watch success count");
  while (watchCount === 0 || successfulUpdates < watchCount) {
    try {
      await update();
    } catch (error) {
      console.error(JSON.stringify({ event: "JMA_SLOT_FAILED", at: new Date().toISOString(), error: String(error), recovery: false, publication: false }));
    }
    if (watchCount > 0 && successfulUpdates >= watchCount) {
      if (missingBasetimes.length) {
        throw new Error("INCOMPLETE_FIVE_MINUTE_COVERAGE: " + missingBasetimes.join(", "));
      }
      return;
    }
    // Let JMA publish the new cycle before polling the next five-minute slot.
    const now = Date.now();
    const offset = 120_000;
    await delay(FIVE_MINUTES - (now - offset) % FIVE_MINUTES);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
