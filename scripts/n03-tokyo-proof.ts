import { readFileSync } from "node:fs";
import { affectedAdministrativeAreas } from "../lib/weather/rain/administrativeAreas";
import { parseN03FeatureCollection, type N03FeatureCollection } from "../lib/weather/rain/n03AdministrativeAreas";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";

const file = process.argv[2];
if (!file) throw new Error("usage: n03-tokyo-proof.ts <N03 GeoJSON>");

const collection = JSON.parse(readFileSync(file, "utf8")) as N03FeatureCollection;
const areas = parseN03FeatureCollection(collection);
const ota = areas.find((area) => area.code === "13111" && area.prefecture === "東京都" && area.municipality === "大田区");
if (!ota) throw new Error("official N03 data did not parse 大田区 / 13111");

const polygons: number[][][][] = ota.geometry.type === "Polygon"
  ? [ota.geometry.coordinates as number[][][]]
  : ota.geometry.coordinates as number[][][][];
const outer: number[][] = polygons.flatMap((polygon) => polygon[0] ?? []);
if (!outer.length) throw new Error("大田区 geometry has no outer ring");

const xs = outer.map((point) => point[0]);
const ys = outer.map((point) => point[1]);
const west = Math.min(...xs), east = Math.max(...xs), south = Math.min(...ys), north = Math.max(...ys);
const padX = (east - west) * 0.05;
const padY = (north - south) * 0.05;
const syntheticRain: HeavyRainPolygon = {
  type: "Polygon",
  coordinates: [[[west - padX, south - padY], [east + padX, south - padY], [east + padX, north + padY], [west - padX, north + padY], [west - padX, south - padY]]],
};

const matches = affectedAdministrativeAreas([syntheticRain], [ota]);
if (matches.length !== 1 || matches[0].code !== "13111") throw new Error("real Ota geometry did not intersect the proof rain polygon");

console.log(JSON.stringify({ featureCount: collection.features.length, parsedAreas: areas.length, otaCode: ota.code, otaMunicipality: ota.municipality, geometryType: ota.geometry.type, intersection: true }));
