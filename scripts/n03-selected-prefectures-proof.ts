import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { affectedAdministrativeAreas } from "../lib/weather/rain/administrativeAreas";
import { n03PrefectureArchiveUrl, n03PrefectureGeoJsonName } from "../lib/weather/rain/n03Dataset";
import { parseN03FeatureCollection, type N03FeatureCollection } from "../lib/weather/rain/n03AdministrativeAreas";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";

async function main() {
const input = JSON.parse(readFileSync(0, "utf8")) as {
  polygons: HeavyRainPolygon[];
  prefectures: { code: string; name: string }[];
};
const root = process.env.N03_CACHE_DIR || mkdtempSync(join(tmpdir(), "n03-selected-"));
mkdirSync(root, { recursive: true });
const timings = { downloadMs: 0, unzipMs: 0, readParseMs: 0, convertMs: 0, intersectionMs: 0 };
let cacheHits = 0;
let preparedCacheHits = 0;

let started = performance.now();
const downloads = input.prefectures.map(async (prefecture) => {
  const zip = join(root, prefecture.code + ".zip");
  if (existsSync(zip)) {
    cacheHits++;
    return { prefecture, zip };
  }
  const response = await fetch(n03PrefectureArchiveUrl(prefecture.code));
  if (!response.ok) throw new Error(`N03 download failed: ${prefecture.code} ${response.status}`);
  writeFileSync(zip, Buffer.from(await response.arrayBuffer()));
  return { prefecture, zip };
});
const downloaded = await Promise.all(downloads);
timings.downloadMs = performance.now() - started;

const areas = [];
for (const { prefecture, zip } of downloaded) {
  const preparedPath = join(root, prefecture.code + ".areas.json");
  if (existsSync(preparedPath)) {
    started = performance.now();
    areas.push(...JSON.parse(readFileSync(preparedPath, "utf8")));
    timings.readParseMs += performance.now() - started;
    preparedCacheHits++;
    continue;
  }
  const dir = join(root, prefecture.code);
  execFileSync("mkdir", ["-p", dir]);
  started = performance.now();
  execFileSync("unzip", ["-oq", zip, "-d", dir]);
  timings.unzipMs += performance.now() - started;
  started = performance.now();
  const collection = JSON.parse(readFileSync(join(dir, n03PrefectureGeoJsonName(prefecture.code)), "utf8")) as N03FeatureCollection;
  timings.readParseMs += performance.now() - started;
  started = performance.now();
  const prefectureAreas = parseN03FeatureCollection(collection).filter((a) => a.prefecture === prefecture.name);
  areas.push(...prefectureAreas);
  writeFileSync(preparedPath, JSON.stringify(prefectureAreas));
  timings.convertMs += performance.now() - started;
}
started = performance.now();
const affected = affectedAdministrativeAreas(input.polygons, areas);
timings.intersectionMs = performance.now() - started;
console.log(JSON.stringify({
  loadedPrefectures: input.prefectures,
  cacheHits,
  preparedCacheHits,
  administrativeAreas: areas.length,
  timings: Object.fromEntries(Object.entries(timings).map(([key, value]) => [key, Math.round(value * 100) / 100])),
  affectedAreas: affected.map((a) => ({ code: a.code, prefecture: a.prefecture, municipality: a.municipality })),
}));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
