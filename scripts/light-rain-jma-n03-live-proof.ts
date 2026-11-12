/** Read-only real JMA forecast + official 2026 Tokyo N03 municipality proof.
 * Coarse z4 tiles are a sampling proof, NOT nationwide coverage or final z10 accuracy.
 * No production Storage, notifications, or Bluesky calls.
 */
import { readFileSync } from "node:fs";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { scanJmaTileAtLeast1mm } from "../lib/weather/rain/lightRainProof";
import { municipalitiesForLightRainTile } from "../lib/weather/rain/lightRainMunicipalities";
import { parseOfficialN03ForLightRain, type N03FeatureCollection } from "../lib/weather/rain/lightRainOfficialN03";

const file = process.argv[2];
if (!file) throw new Error("Usage: npx tsx scripts/light-rain-jma-n03-live-proof.ts <official Tokyo N03 GeoJSON>");
const collection = JSON.parse(readFileSync(file, "utf8")) as N03FeatureCollection;
const areas = parseOfficialN03ForLightRain(collection).filter(a => a.prefecture === "東京都");
if (!areas.some(a => a.code === "13111")) throw new Error("Official N03 Tokyo missing Ota City");
const tiles = [[13, 5], [14, 5], [13, 6], [14, 6], [13, 7], [14, 7]] as const;
const stamp = (v: string) => Date.UTC(Number(v.slice(0,4)), Number(v.slice(4,6))-1,
  Number(v.slice(6,8)), Number(v.slice(8,10)), Number(v.slice(10,12)));
async function main() {
  const now = Date.now();
  const frames = (await fetchForecastTargetTimes())
    .filter(f => stamp(f.validtime) > now && stamp(f.validtime) <= now + 30 * 60000).slice(0,6);
  if (!frames.length) throw new Error("No future JMA frames within 30 minutes");
  const results = [];
  for (const frame of frames) {
    const codes = new Map<string, { code: string; prefecture: string; municipality: string }>();
    let rainyPixels = 0;
    for (const [x,y] of tiles) {
      const response = await fetch(buildJmaRainTileUrl(frame,4,x,y), {cache:"no-store"});
      if (!response.ok) throw new Error("Missing JMA tile "+frame.validtime+" z4/"+x+"/"+y);
      const buffer = Buffer.from(await response.arrayBuffer());
      const scan = scanJmaTileAtLeast1mm(buffer);
      if (scan.unknownPixels) throw new Error("Unknown JMA palette pixel");
      rainyPixels += scan.rainPixels;
      if (!scan.rainPixels) continue;
      for (const area of municipalitiesForLightRainTile(buffer,4,x,y,areas)) codes.set(area.code,area);
    }
    results.push({validtime:frame.validtime,rainyPixels,municipalities:[...codes.values()]});
  }
  if (results.every(r => r.rainyPixels === 0)) throw new Error("No real JMA >=1mm rain pixels in sample");
  if (results.every(r => r.municipalities.length === 0)) throw new Error("INCOMPLETE_PROOF: no real rainy pixel intersected an official Tokyo municipality; do not claim municipality resolution");
  console.log(JSON.stringify({mode:"REAL_JMA_OFFICIAL_TOKYO_N03_READ_ONLY",checkedAt:new Date().toISOString(),
    threshold:">=1mm/h",zoom:4,tiles:tiles.length,frames:results,coverage:"six coarse tiles only",
    precision:"coarse pixel footprints; not suitable for publishing municipality alerts",
    productionWrites:false,blueskyPosts:false}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
