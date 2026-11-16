/** Offline, read-only preparation of official N03 GeoJSON for the PR #59-compatible audit.
 * Usage: npx tsx scripts/light-rain-prepare-official-n03.ts <prefecture-code> <official-geojson> <output-root>
 * Does not download or write to production Storage.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_PREFECTURE_CODES } from "../lib/weather/rain/lightRainNationwideN03";
import { parseOfficialN03ForLightRain, type N03FeatureCollection } from "../lib/weather/rain/lightRainOfficialN03";

const [code, source, root] = process.argv.slice(2);
if (!ALL_PREFECTURE_CODES.includes(code) || !source || !root) {
  throw new Error("Usage: npx tsx scripts/light-rain-prepare-official-n03.ts <01..47> <official-geojson> <output-root>");
}
const collection = JSON.parse(readFileSync(source, "utf8")) as N03FeatureCollection;
const areas = parseOfficialN03ForLightRain(collection);
if (!areas.length) throw new Error("INCOMPLETE_N03_COVERAGE: no municipalities for " + code);
if (areas.some(a => !a.code.startsWith(code))) throw new Error("INCOMPLETE_N03_COVERAGE: foreign prefecture code in " + code);
if (new Set(areas.map(a => a.prefecture)).size !== 1) throw new Error("INCOMPLETE_N03_COVERAGE: conflicting prefecture names in " + code);
mkdirSync(root, { recursive: true });
const target = join(root, code + ".areas.json");
writeFileSync(target, JSON.stringify(areas));
console.log(JSON.stringify({mode:"PREPARE_OFFICIAL_N03_LOCAL_ONLY",prefectureCode:code,municipalities:areas.length,target,productionWrites:false}));
