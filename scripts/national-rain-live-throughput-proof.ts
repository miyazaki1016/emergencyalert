import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { PNG } from "pngjs";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { fetchObservationTargetTimes } from "../lib/weather/providers/jma/observationTargetTimes";
import { candidateKey } from "../lib/weather/rain/nationalHeavyRain";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { heavyRainAreaPolygons, scanHeavyRainTile } from "../lib/weather/rain/nationalHeavyRain";
import { N03_PREFECTURE_INDEX_2026 } from "../lib/weather/rain/n03PrefectureIndex2026";
import { prefecturesForRainPolygons } from "../lib/weather/rain/n03Prefectures";
import { n03PrefectureArchiveUrl, n03PrefectureGeoJsonName } from "../lib/weather/rain/n03Dataset";
import { parseN03FeatureCollection, type N03FeatureCollection } from "../lib/weather/rain/n03AdministrativeAreas";
import { municipalitiesForNationalRainFootprint } from "../lib/weather/rain/nationalRainMunicipalities";

async function main() {
  const root = process.env.N03_CACHE_DIR || mkdtempSync(join(tmpdir(), "national-rain-throughput-"));
  mkdirSync(root, { recursive: true });
  const [observations, frames] = await Promise.all([fetchObservationTargetTimes(), fetchForecastTargetTimes()]);
  const currentFrame = observations[0];
  const frame = frames[0];
  if (!currentFrame || !frame) throw new Error("No JMA target time");
  const zoom = 8;
  const coarseTiles = [[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
  const scanCoarse = async (target: { basetime:string; validtime:string }) => (await Promise.all(coarseTiles.map(async ([x,y]) => {
    const r=await fetch(buildJmaRainTileUrl(target,4,x,y)); if(!r.ok) throw new Error(`coarse JMA tile fetch failed: ${r.status}`);
    return scanHeavyRainTile(Buffer.from(await r.arrayBuffer()),4,x,y);
  }))).flat();
  const currentKeys=new Set((await scanCoarse(currentFrame)).map(candidateKey));
  const upcoming=(await scanCoarse(frame)).filter(c=>!currentKeys.has(candidateKey(c)));
  const selected=new Map<string,{x:number;y:number}>();
  for(const c of upcoming){ const x=c.tileX*16+Math.floor(c.pixelX/16), y=c.tileY*16+Math.floor(c.pixelY/16); selected.set(`${x}:${y}`,{x,y}); if(selected.size>=4) break; }
  const sampleTiles=[...selected.values()];
  if(sampleTiles.length===0){ console.log(JSON.stringify({mode:"READ_ONLY_LIVE_THROUGHPUT_PROOF",frame,skipped:true,reason:"NO_LIVE_UPCOMING_HEAVY_RAIN"})); return; }
  const started = performance.now();
  const rows = [];
  for (const tile of sampleTiles) {
    const one = performance.now();
    const response = await fetch(buildJmaRainTileUrl(frame, zoom, tile.x, tile.y));
    if (!response.ok) throw new Error(`JMA tile fetch failed: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    PNG.sync.read(buffer);
    const candidates = scanHeavyRainTile(buffer, zoom, tile.x, tile.y, 1);
    const footprint = heavyRainAreaPolygons(candidates, zoom);
    const prefs = prefecturesForRainPolygons(footprint, N03_PREFECTURE_INDEX_2026);
    const areas = [];
    for (const pref of prefs) {
      const prepared = join(root, pref.code + ".areas.json");
      if (!existsSync(prepared)) {
        const zip = join(root, pref.code + ".zip");
        if (!existsSync(zip)) {
          const r = await fetch(n03PrefectureArchiveUrl(pref.code));
          if (!r.ok) throw new Error(`N03 download failed: ${pref.code} ${r.status}`);
          writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
        }
        const dir = join(root, pref.code); mkdirSync(dir, { recursive: true });
        execFileSync("unzip", ["-oq", zip, "-d", dir]);
        const fc = JSON.parse(readFileSync(join(dir, n03PrefectureGeoJsonName(pref.code)), "utf8")) as N03FeatureCollection;
        writeFileSync(prepared, JSON.stringify(parseN03FeatureCollection(fc).filter((a) => a.prefecture === pref.name)));
      }
      areas.push(...JSON.parse(readFileSync(prepared, "utf8")));
    }
    const municipalities = municipalitiesForNationalRainFootprint(footprint, areas);
    rows.push({ tile, strongPixels: candidates.length, prefectures: prefs.map(p=>p.code), municipalities: municipalities.length, elapsedMs: Math.round((performance.now()-one)*100)/100 });
  }
  const elapsedMs = performance.now() - started;
  console.log(JSON.stringify({ mode:"READ_ONLY_LIVE_THROUGHPUT_PROOF", frame, jobs:rows.length, elapsedMs:Math.round(elapsedMs*100)/100, jobsPer45s:Math.round(rows.length/elapsedMs*45000*100)/100, memoryMiB:Math.round(process.memoryUsage().rss/1048576*100)/100, rows }));
}
main().catch((e)=>{ console.error(e); process.exit(1); });
