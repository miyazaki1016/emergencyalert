import { readFileSync } from "node:fs";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { affectedAdministrativeAreas } from "../lib/weather/rain/administrativeAreas";
import { parseN03FeatureCollection, type N03FeatureCollection } from "../lib/weather/rain/n03AdministrativeAreas";
import { heavyRainAreaPolygons, scanHeavyRainTile } from "../lib/weather/rain/nationalHeavyRain";

const ZOOM = 8;
const file = process.argv[2];
if (!file) throw new Error("usage: n03-tokyo-live-rain-proof.ts <N03 GeoJSON>");

const collection = JSON.parse(readFileSync(file, "utf8")) as N03FeatureCollection;
const areas = parseN03FeatureCollection(collection).filter((area) => area.prefecture === "東京都");

function lonToTileX(lon: number) { return Math.floor((lon + 180) / 360 * 2 ** ZOOM); }
function latToTileY(lat: number) {
  const rad = lat * Math.PI / 180;
  return Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * 2 ** ZOOM);
}

async function main() {
  const frames = await fetchForecastTargetTimes();
  if (!frames.length) throw new Error("No JMA forecast frames");
  // Tokyo metropolitan mainland + islands are intentionally bounded by the official N03 geometry bbox.
  const points = areas.flatMap((area) => {
    const polygons = area.geometry.type === "Polygon" ? [area.geometry.coordinates as number[][][]] : area.geometry.coordinates as number[][][][];
    return polygons.flatMap((polygon) => polygon[0] ?? []);
  });
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const minX = lonToTileX(Math.min(...xs)), maxX = lonToTileX(Math.max(...xs));
  const minY = latToTileY(Math.max(...ys)), maxY = latToTileY(Math.min(...ys));

  let strongPixels = 0;
  const rainPolygons = [];
  for (const frame of frames) {
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const response = await fetch(buildJmaRainTileUrl(frame, ZOOM, x, y));
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      const candidates = scanHeavyRainTile(buffer, ZOOM, x, y, 1);
      strongPixels += candidates.length;
      rainPolygons.push(...heavyRainAreaPolygons(candidates, ZOOM));
    }
  }
  const affected = affectedAdministrativeAreas(rainPolygons, areas);
  console.log(JSON.stringify({ frames: frames.length, tokyoAdministrativeAreas: areas.length, strongPixels, rainPolygons: rainPolygons.length, affectedAreas: affected.map((a) => ({ code: a.code, prefecture: a.prefecture, municipality: a.municipality })) }));
}
main().catch((error) => { console.error(error); process.exit(1); });
