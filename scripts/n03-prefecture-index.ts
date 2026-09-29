import { readFileSync } from "node:fs";
import { parseN03FeatureCollection, type N03FeatureCollection } from "../lib/weather/rain/n03AdministrativeAreas";
import type { N03PrefectureIndexEntry } from "../lib/weather/rain/n03Prefectures";

const files = process.argv.slice(2);
if (!files.length) throw new Error("usage: n03-prefecture-index.ts <N03 GeoJSON> [...]");

const byPrefecture = new Map<string, N03PrefectureIndexEntry>();
for (const file of files) {
  const collection = JSON.parse(readFileSync(file, "utf8")) as N03FeatureCollection;
  for (const area of parseN03FeatureCollection(collection)) {
    const code = area.code.slice(0, 2);
    const polygons = area.geometry.type === "Polygon"
      ? [area.geometry.coordinates as number[][][]]
      : area.geometry.coordinates as number[][][][];
    let entry = byPrefecture.get(code);
    if (!entry) {
      entry = { code, name: area.prefecture, bbox: [Infinity, Infinity, -Infinity, -Infinity] };
      byPrefecture.set(code, entry);
    }
    for (const polygon of polygons) for (const [lon, lat] of polygon[0] ?? []) {
      entry.bbox[0] = Math.min(entry.bbox[0], lon);
      entry.bbox[1] = Math.min(entry.bbox[1], lat);
      entry.bbox[2] = Math.max(entry.bbox[2], lon);
      entry.bbox[3] = Math.max(entry.bbox[3], lat);
    }
  }
}
const index = [...byPrefecture.values()].sort((a,b) => a.code.localeCompare(b.code));
if (index.some((entry) => !entry.bbox.every(Number.isFinite))) throw new Error("Invalid prefecture bbox");
console.log(JSON.stringify(index));
