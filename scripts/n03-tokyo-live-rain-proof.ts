import { readFileSync } from "node:fs";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { affectedAdministrativeAreas } from "../lib/weather/rain/administrativeAreas";
import { parseN03FeatureCollection, type N03FeatureCollection } from "../lib/weather/rain/n03AdministrativeAreas";
import { clusterHeavyRainCandidates, heavyRainAreaPolygons, scanHeavyRainTile } from "../lib/weather/rain/nationalHeavyRain";

const COARSE_ZOOM = 4;
const REFINE_ZOOM = 8;
const COARSE_TILES = [[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
const file = process.argv[2];
if (!file) throw new Error("usage: n03-tokyo-live-rain-proof.ts <N03 GeoJSON>");

const collection = JSON.parse(readFileSync(file, "utf8")) as N03FeatureCollection;
const tokyoAreas = parseN03FeatureCollection(collection).filter((area) => area.prefecture === "東京都");

function latLonToTile(latitude: number, longitude: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor((longitude + 180) / 360 * n);
  const rad = latitude * Math.PI / 180;
  const y = Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * n);
  return { x, y };
}

async function main() {
  const frames = await fetchForecastTargetTimes();
  if (!frames.length) throw new Error("No JMA forecast frames");
  let coarseStrongPixels = 0, refinedStrongPixels = 0, refinedTileFetches = 0;
  const rainPolygons = [];

  for (const frame of frames) {
    const coarse = [];
    for (const [x, y] of COARSE_TILES) {
      const response = await fetch(buildJmaRainTileUrl(frame, COARSE_ZOOM, x, y));
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      coarse.push(...scanHeavyRainTile(buffer, COARSE_ZOOM, x, y));
    }
    coarseStrongPixels += coarse.length;
    const clusters = clusterHeavyRainCandidates(coarse);
    const tiles = new Map<string, {x:number;y:number}>();
    for (const cluster of clusters) {
      const tile = latLonToTile(cluster.latitude, cluster.longitude, REFINE_ZOOM);
      tiles.set(`${tile.x}:${tile.y}`, tile);
    }
    for (const tile of tiles.values()) {
      const response = await fetch(buildJmaRainTileUrl(frame, REFINE_ZOOM, tile.x, tile.y));
      if (!response.ok) continue;
      refinedTileFetches += 1;
      const buffer = Buffer.from(await response.arrayBuffer());
      const candidates = scanHeavyRainTile(buffer, REFINE_ZOOM, tile.x, tile.y, 1);
      refinedStrongPixels += candidates.length;
      rainPolygons.push(...heavyRainAreaPolygons(candidates, REFINE_ZOOM));
    }
  }

  const affected = affectedAdministrativeAreas(rainPolygons, tokyoAreas);
  console.log(JSON.stringify({
    frames: frames.length,
    tokyoAdministrativeAreas: tokyoAreas.length,
    coarseStrongPixels,
    refinedTileFetches,
    refinedStrongPixels,
    rainPolygons: rainPolygons.length,
    affectedAreas: affected.map((a) => ({ code: a.code, prefecture: a.prefecture, municipality: a.municipality })),
  }));
}
main().catch((error) => { console.error(error); process.exit(1); });
