import { PNG } from "pngjs";
import { fetchObservationTargetTimes } from "../lib/weather/providers/jma/observationTargetTimes";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { candidateKey, clusterHeavyRainCandidates, scanHeavyRainTile, trackHeavyRainClusters } from "../lib/weather/rain/nationalHeavyRain";

const ZOOM = 4;
const REFINE_ZOOM = 8;
const TILES = [[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;

async function scan(frame: { basetime: string; validtime: string }) {
  const all = [];
  let bytes = 0;
  for (const [x,y] of TILES) {
    const response = await fetch(buildJmaRainTileUrl(frame, ZOOM, x, y));
    if (!response.ok) continue;
    const buffer = Buffer.from(await response.arrayBuffer());
    bytes += buffer.length;
    PNG.sync.read(buffer); // fail loudly on malformed PNG
    all.push(...scanHeavyRainTile(buffer, ZOOM, x, y));
  }
  return { candidates: all, bytes };
}

function latLonToTile(latitude: number, longitude: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor((longitude + 180) / 360 * n);
  const latRad = latitude * Math.PI / 180;
  const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

async function refine(frame: { basetime: string; validtime: string }, centers: Array<{ latitude: number; longitude: number }>) {
  const tiles = new Map<string, { x: number; y: number }>();
  for (const center of centers) {
    const tile = latLonToTile(center.latitude, center.longitude, REFINE_ZOOM);
    const n = 2 ** REFINE_ZOOM;
    const worldX = (center.longitude + 180) / 360 * n;
    const latRad = center.latitude * Math.PI / 180;
    const worldY = (1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n;
    const fx = worldX - Math.floor(worldX);
    const fy = worldY - Math.floor(worldY);
    const offsetsX = [0];
    const offsetsY = [0];
    const edge = 0.2;
    if (fx < edge) offsetsX.push(-1);
    if (fx > 1 - edge) offsetsX.push(1);
    if (fy < edge) offsetsY.push(-1);
    if (fy > 1 - edge) offsetsY.push(1);
    for (const dy of offsetsY) {
      for (const dx of offsetsX) {
        const neighbor = { x: tile.x + dx, y: tile.y + dy };
        tiles.set(`${neighbor.x}:${neighbor.y}`, neighbor);
      }
    }
  }
  let bytes = 0;
  let strongPixels = 0;
  for (const tile of tiles.values()) {
    const response = await fetch(buildJmaRainTileUrl(frame, REFINE_ZOOM, tile.x, tile.y));
    if (!response.ok) continue;
    const buffer = Buffer.from(await response.arrayBuffer());
    bytes += buffer.length;
    strongPixels += scanHeavyRainTile(buffer, REFINE_ZOOM, tile.x, tile.y, 1).length;
  }
  return { tileCount: tiles.size, bytes, strongPixels };
}

async function main() {
  const started = Date.now();
  const [obs, forecasts] = await Promise.all([fetchObservationTargetTimes(), fetchForecastTargetTimes()]);
  if (!obs[0]) throw new Error("No current observation frame");
  const current = await scan(obs[0]);
  const currentKeys = new Set(current.candidates.map(candidateKey));
  let totalBytes = current.bytes;
  const summary = [];
  const clusterFrames: Array<{ validTime: string; clusters: ReturnType<typeof clusterHeavyRainCandidates> }> = [];
  let refinedBytes = 0;
  let refinedTiles = 0;
  const uniqueRefinedTiles = new Set<string>();
  const timelineTileFrames = new Map<string, string[]>();
  for (const frame of forecasts) {
    const result = await scan(frame);
    totalBytes += result.bytes;
    const upcoming = result.candidates.filter((c) => !currentKeys.has(candidateKey(c)));
    const clusters = clusterHeavyRainCandidates(upcoming);
    clusterFrames.push({ validTime: frame.validtime, clusters });
    const refined = await refine(frame, clusters.map((c) => ({ latitude: c.latitude, longitude: c.longitude })));
    refinedBytes += refined.bytes;
    refinedTiles += refined.tileCount;
    for (const cluster of clusters) {
      const tile = latLonToTile(cluster.latitude, cluster.longitude, REFINE_ZOOM);
      const key = `${tile.x}:${tile.y}`;
      uniqueRefinedTiles.add(key);
      const times = timelineTileFrames.get(key) ?? [];
      times.push(frame.validtime);
      timelineTileFrames.set(key, times);
    }
    summary.push({ validTime: frame.validtime, upcoming: upcoming.length, clusters: clusters.length, largestCluster: Math.max(0, ...clusters.map((c) => c.candidates.length)), refinedTiles: refined.tileCount, refinedStrongPixels: refined.strongPixels });
  }
  const tracks = trackHeavyRainClusters(clusterFrames);
  console.log(JSON.stringify({
    elapsedMs: Date.now() - started,
    zoom: ZOOM,
    tileCount: TILES.length,
    currentStrongPixels: current.candidates.length,
    forecastFrames: summary,
    fetchedBytes: totalBytes,
    refinement: { zoom: REFINE_ZOOM, tileFetches: refinedTiles, uniqueTilesAcrossTimeline: uniqueRefinedTiles.size, duplicateTileFetches: refinedTiles - uniqueRefinedTiles.size, fetchedBytes: refinedBytes },
    rainTracks: tracks.map((track) => ({ id: track.id, frameCount: track.points.length, firstValidTime: track.points[0]?.validTime, lastValidTime: track.points[track.points.length - 1]?.validTime, maxLevel: track.level, start: track.points[0] ? { latitude: track.points[0].latitude, longitude: track.points[0].longitude } : null, end: track.points[track.points.length - 1] ? { latitude: track.points[track.points.length - 1].latitude, longitude: track.points[track.points.length - 1].longitude } : null })),
    trackedRegions: [...timelineTileFrames.entries()].map(([tile, validTimes]) => ({ tile, firstValidTime: validTimes[0], lastValidTime: validTimes[validTimes.length - 1], frameCount: validTimes.length }))
  }, null, 2));
  
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
