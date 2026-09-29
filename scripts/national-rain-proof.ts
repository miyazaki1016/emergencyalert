import { PNG } from "pngjs";
import { fetchObservationTargetTimes } from "../lib/weather/providers/jma/observationTargetTimes";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { candidateKey, scanHeavyRainTile } from "../lib/weather/rain/nationalHeavyRain";

const ZOOM = 4;
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

const started = Date.now();
const [obs, forecasts] = await Promise.all([fetchObservationTargetTimes(), fetchForecastTargetTimes()]);
if (!obs[0]) throw new Error("No current observation frame");
const current = await scan(obs[0]);
const currentKeys = new Set(current.candidates.map(candidateKey));
let totalBytes = current.bytes;
const summary = [];
for (const frame of forecasts) {
  const result = await scan(frame);
  totalBytes += result.bytes;
  const upcoming = result.candidates.filter((c) => !currentKeys.has(candidateKey(c)));
  summary.push({ validTime: frame.validtime, upcoming: upcoming.length });
}
console.log(JSON.stringify({
  elapsedMs: Date.now() - started,
  zoom: ZOOM,
  tileCount: TILES.length,
  currentStrongPixels: current.candidates.length,
  forecastFrames: summary,
  fetchedBytes: totalBytes
}, null, 2));
