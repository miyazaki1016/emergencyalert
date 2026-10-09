import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JAPAN_PREFECTURES } from "../lib/weather/rain/japanPrefectures";
import { n03PrefectureArchiveUrl, n03PrefectureGeoJsonName } from "../lib/weather/rain/n03Dataset";
import { parseN03FeatureCollection, type N03FeatureCollection } from "../lib/weather/rain/n03AdministrativeAreas";
import type { N03PrefectureIndexEntry } from "../lib/weather/rain/n03Prefectures";

const root = mkdtempSync(join(tmpdir(), "n03-national-"));
const index: N03PrefectureIndexEntry[] = [];
for (const prefecture of JAPAN_PREFECTURES) {
  const zip = join(root, prefecture.code + ".zip");
  const dir = join(root, prefecture.code);
  execFileSync("curl", ["--fail","--location","--retry","3",n03PrefectureArchiveUrl(prefecture.code),"-o",zip], { stdio: "ignore" });
  execFileSync("mkdir", ["-p",dir]);
  execFileSync("unzip", ["-q",zip,"-d",dir]);
  const file = join(dir, n03PrefectureGeoJsonName(prefecture.code));
  const collection = JSON.parse(readFileSync(file,"utf8")) as N03FeatureCollection;
  const areas = parseN03FeatureCollection(collection).filter((area) => area.prefecture === prefecture.name);
  if (!areas.length) throw new Error(`No N03 areas for ${prefecture.code} ${prefecture.name}`);
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  for (const area of areas) {
    const polygons = area.geometry.type === "Polygon" ? [area.geometry.coordinates as number[][][]] : area.geometry.coordinates as number[][][][];
    for (const polygon of polygons) for (const [lon,lat] of polygon[0] ?? []) {
      west=Math.min(west,lon); south=Math.min(south,lat); east=Math.max(east,lon); north=Math.max(north,lat);
    }
  }
  index.push({ code: prefecture.code, name: prefecture.name, bbox:[west,south,east,north] });
}
if (index.length !== 47) throw new Error(`Expected 47 prefectures, got ${index.length}`);
console.log(JSON.stringify({ prefectures:index.length, index }));
