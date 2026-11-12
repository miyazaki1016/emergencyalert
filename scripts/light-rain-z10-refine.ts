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
async function fetchTile(frame:{basetime:string;validtime:string},z:number,x:number,y:number){
  const url=buildJmaRainTileUrl(frame,z,x,y);
  const attempts: string[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      attempts.push("HTTP " + response.status);
      if (![404, 408, 429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      attempts.push(error instanceof Error ? error.name : "TransportError");
    }
    if (attempt < 3) await delay(1000 * 2 ** attempt);
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
) {
  const started = performance.now();
  const candidates = new Map<string, AdministrativeArea>();
  const rainyZ10Tiles = new Map<string, { x: number; y: number }>();
  for (const [x, y] of tiles4) {
    const bounds = [lon(x, 4), lat(y + 1, 4), lon(x + 1, 4), lat(y, 4)];
    const relevant = indexed.filter(({ b }) => b[0] <= bounds[2] && b[2] >= bounds[0]
      && b[1] <= bounds[3] && b[3] >= bounds[1]).map(({ area }) => area);
    const buffer = await fetchTile(frame, 4, x, y);
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
    const batch=entries.slice(i,i+8);
    const outcomes=await Promise.all(batch.map(async t=>{
      const fetchStart=performance.now();
      const buffer=await fetchTile(frame,10,t.x,t.y);
      const fetchMs=performance.now()-fetchStart;
      const matchStart=performance.now();
      const scan=scanJmaTileAtLeast1mm(buffer);
      if(scan.unknownPixels)throw new Error("UNKNOWN_JMA_PIXEL_Z10 "+t.x+"/"+t.y);
      const municipalities=scan.rainPixels?municipalitiesForLightRainTile(buffer,10,t.x,t.y,t.areas):[];
      return {scan,municipalities,fetchMs,matchingMs:performance.now()-matchStart};
    }));
    for(const o of outcomes){z10NetworkMs+=o.fetchMs;z10MatchingMs+=o.matchingMs;if(o.scan.rainPixels)rainyTiles++;for(const a of o.municipalities)matched.set(a.code,a);}
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
  const update = async () => {
    const scanStarted = performance.now();
    const targets = await fetchForecastTargetTimes((input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(25_000) }));
    const frames = selectFrames(targets, Date.now());
    if (frames[0].basetime === previousBase) return;
    const results = [];
    for (const frame of frames) results.push(await refineFrame(frame, indexed, areaByCode));

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
    previousBase = frames[0].basetime;
    successfulUpdates++;
  };

  if (!process.argv.includes("--watch")) return update();
  const watchCount = Number(process.env.JMA_WATCH_SUCCESS_COUNT || "0");
  if (!Number.isSafeInteger(watchCount) || watchCount < 0) throw new Error("Invalid watch success count");
  while (watchCount === 0 || successfulUpdates < watchCount) {
    try {
      await update();
    } catch (error) {
      console.error(error);
    }
    if (watchCount > 0 && successfulUpdates >= watchCount) return;
    // Let JMA publish the new cycle before polling the next five-minute slot.
    const now = Date.now();
    const offset = 120_000;
    await delay(FIVE_MINUTES - (now - offset) % FIVE_MINUTES);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
