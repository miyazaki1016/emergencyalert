import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { parseOfficialN03ForLightRain, type N03FeatureCollection } from "../lib/weather/rain/lightRainOfficialN03";
import { municipalitiesForLightRainTile } from "../lib/weather/rain/lightRainMunicipalities";

/** Read-only official N03 + synthetic 1mm pixel proof. No Supabase or Bluesky access. */
const path = process.argv[2];
if (!path) throw new Error("Usage: npx tsx scripts/light-rain-official-n03-proof.ts <N03-20260101_13.geojson>");
const collection = JSON.parse(readFileSync(path, "utf8")) as N03FeatureCollection;
const areas = parseOfficialN03ForLightRain(collection);
const ota = areas.find(a => a.code === "13111" && a.prefecture === "東京都" && a.municipality === "大田区");
if (!ota) throw new Error("Official N03 Tokyo does not include Ota City / 13111");
const rings: number[][][][] = ota.geometry.type === "Polygon" 
  ? [ota.geometry.coordinates as number[][][]] 
  : ota.geometry.coordinates as number[][][][];
const vertices = rings.flatMap(p => p[0] ?? []);
if (!vertices.length) throw new Error("Ota City has no outer ring");
const lon = vertices.reduce((sum, p) => sum + p[0], 0) / vertices.length;
const lat = vertices.reduce((sum, p) => sum + p[1], 0) / vertices.length;
const zoom = 10, n = 2 ** zoom;
const wx = (lon + 180) / 360 * n * 256;
const wy = (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n * 256;
const tx = Math.floor(wx / 256), ty = Math.floor(wy / 256);
const px = Math.floor(wx) - tx * 256, py = Math.floor(wy) - ty * 256;
const png = new PNG({ width: 256, height: 256 });
png.data.fill(0);
png.data.set([160, 210, 255, 255], (py * 256 + px) * 4);
const matches = municipalitiesForLightRainTile(PNG.sync.write(png), zoom, tx, ty, areas);
if (!matches.some(m => m.code === "13111")) throw new Error("Synthetic 1mm pixel did not intersect real Ota geometry");
console.log(JSON.stringify({ mode: "OFFICIAL_N03_SYNTHETIC_1MM_PIXEL", source: path, municipalities: areas.length,
  target: "13111 大田区", matched: matches.filter(m => m.code === "13111"), rain: "synthetic", productionWrites: false }));
