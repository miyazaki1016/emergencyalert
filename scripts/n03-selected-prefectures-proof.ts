import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { affectedAdministrativeAreas } from "../lib/weather/rain/administrativeAreas";
import { n03PrefectureArchiveUrl, n03PrefectureGeoJsonName } from "../lib/weather/rain/n03Dataset";
import { parseN03FeatureCollection, type N03FeatureCollection } from "../lib/weather/rain/n03AdministrativeAreas";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";

const input = JSON.parse(readFileSync(0, "utf8")) as {
  polygons: HeavyRainPolygon[];
  prefectures: { code: string; name: string }[];
};
const root = mkdtempSync(join(tmpdir(), "n03-selected-"));
const areas = [];
const timings = { downloadMs: 0, unzipMs: 0, readParseMs: 0, convertMs: 0, intersectionMs: 0 };
for (const prefecture of input.prefectures) {
  const zip = join(root, prefecture.code + ".zip");
  const dir = join(root, prefecture.code);
  let started = performance.now();
  execFileSync("curl", ["--fail","--location","--retry","3",n03PrefectureArchiveUrl(prefecture.code),"-o",zip], {stdio:"ignore"});
  timings.downloadMs += performance.now() - started;
  execFileSync("mkdir",["-p",dir]);
  started = performance.now();
  execFileSync("unzip",["-q",zip,"-d",dir]);
  timings.unzipMs += performance.now() - started;
  started = performance.now();
  const collection=JSON.parse(readFileSync(join(dir,n03PrefectureGeoJsonName(prefecture.code)),"utf8")) as N03FeatureCollection;
  timings.readParseMs += performance.now() - started;
  started = performance.now();
  areas.push(...parseN03FeatureCollection(collection).filter(a=>a.prefecture===prefecture.name));
  timings.convertMs += performance.now() - started;
}
let started = performance.now();
const affected=affectedAdministrativeAreas(input.polygons,areas);
timings.intersectionMs = performance.now() - started;
console.log(JSON.stringify({loadedPrefectures:input.prefectures,administrativeAreas:areas.length,timings:Object.fromEntries(Object.entries(timings).map(([key,value])=>[key,Math.round(value*100)/100])),affectedAreas:affected.map(a=>({code:a.code,prefecture:a.prefecture,municipality:a.municipality}))}));
