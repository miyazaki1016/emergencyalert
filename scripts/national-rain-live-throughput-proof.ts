import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { PNG } from "pngjs";
import { fetchJmaTargetTimes } from "../lib/weather/providers/jma/targetTimes";
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
  const target = await fetchJmaTargetTimes();
  const frame = target.observation ?? target.forecasts[0];
  if (!frame) throw new Error("No JMA target time");
  const zoom = 8;
  const sampleTiles = [{ x: 226, y: 100 }, { x: 227, y: 100 }, { x: 226, y: 101 }, { x: 227, y: 101 }];
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
