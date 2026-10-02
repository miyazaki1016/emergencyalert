import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { heavyRainAreaPolygons, scanHeavyRainTile } from "../lib/weather/rain/nationalHeavyRain";
import { prefecturesForRainPolygons } from "../lib/weather/rain/n03Prefectures";
import { N03_PREFECTURE_INDEX_2026 } from "../lib/weather/rain/n03PrefectureIndex2026";
import { resolveNationalRainMunicipalities } from "../lib/weather/rain/nationalRainMunicipalityResolver";
import { localPreparedLoader, prepareProofN03 } from "./national-rain-proof-n03";
import { measureWorker } from "./national-rain-throughput-harness";

async function main() {
  const scenario = process.argv[2] ?? "dense";
  if (!["dense", "fragmented", "hokkaido"].includes(scenario)) throw new Error("Unknown stress scenario");
  const concurrency = Number(process.argv[3] ?? 4);
  if (![1,4].includes(concurrency)) throw new Error("Proof concurrency must be 1 or 4");
  const z8Tile = scenario === "hokkaido" ? { x:228,y:94 } : { x:227,y:100 };
  // Preserve the same geographic area when moving the final-stage proof from z8 to z10.
  const tile = { x: z8Tile.x * 4, y: z8Tile.y * 4 };
  const png = new PNG({ width:256,height:256 });
  for (let y=0;y<256;y++) for (let x=0;x<256;x++) {
    // Deliberate manufactured test data, never weather evidence.
    const occupied = scenario !== "fragmented" || (x>=96 && x<160 && y>=96 && y<160 && (x+y)%2===0);
    if (occupied) { const i=(y*256+x)*4; png.data[i]=255; png.data[i+1]=40; png.data[i+2]=0; png.data[i+3]=255; }
  }
  const body = PNG.sync.write(png);
  const footprint = heavyRainAreaPolygons(scanHeavyRainTile(body,10,tile.x,tile.y,1),10);
  const prefs = prefecturesForRainPolygons(footprint,N03_PREFECTURE_INDEX_2026);
  const root = process.env.N03_CACHE_DIR || mkdtempSync(join(tmpdir(), "national-rain-stress-"));
  mkdirSync(root,{recursive:true});
  prepareProofN03(root,prefs.map(p=>p.code));
  const loader = localPreparedLoader(root);
  const jobs = Array.from({length:50},(_,i)=>({id:i+1,run_key:`synthetic-${i}`,basetime:"20260930060000",validtime:"20260930060500",zoom:10,tile_x:tile.x,tile_y:tile.y}));
  const resolveMunicipalities = (rain: Parameters<typeof resolveNationalRainMunicipalities>[0]) => resolveNationalRainMunicipalities(rain,loader.load);
  const measured = await measureWorker({ jobs,concurrency,fetcher:async()=>new Response(new Uint8Array(body)),resolveMunicipalities });
  if (!measured.municipalityHits) throw new Error("Stress proof must exercise positive exact N03 municipality intersection");
  if (Object.values(loader.downloads).some(n=>n!==1)) throw new Error("N03 single-flight/cache violated");
  console.log(JSON.stringify({mode:"SYNTHETIC_STRESS_NOT_METEOROLOGICAL_EVIDENCE",scenario,tile,jobsOffered:50,prefectures:prefs.map(p=>p.code),downloads:loader.downloads,...measured,
    n03Source:"Real 20260101 N03 geometry via local prepared Storage adapter",
    limitations:[...measured.limitations,"Synthetic PNG and local Storage IO; excludes JMA/Storage HTTP latency", "Repeated tile geometry; nationwide diverse-prefecture memory remains unproven"],
    schedulerDecision:"NOT_PRODUCTION_READY",
  }));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
