import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
for (const prefecture of input.prefectures) {
  const zip = join(root, prefecture.code + ".zip");
  const dir = join(root, prefecture.code);
  execFileSync("curl", ["--fail","--location","--retry","3",n03PrefectureArchiveUrl(prefecture.code),"-o",zip], {stdio:"ignore"});
  execFileSync("mkdir",["-p",dir]);
  execFileSync("unzip",["-q",zip,"-d",dir]);
  const collection=JSON.parse(readFileSync(join(dir,n03PrefectureGeoJsonName(prefecture.code)),"utf8")) as N03FeatureCollection;
  areas.push(...parseN03FeatureCollection(collection).filter(a=>a.prefecture===prefecture.name));
}
const affected=affectedAdministrativeAreas(input.polygons,areas);
console.log(JSON.stringify({loadedPrefectures:input.prefectures,administrativeAreas:areas.length,affectedAreas:affected.map(a=>({code:a.code,prefecture:a.prefecture,municipality:a.municipality}))}));
