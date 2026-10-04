import { PNG } from "pngjs";
import { fetchObservationTargetTimes } from "../lib/weather/providers/jma/observationTargetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { classifyRainPixel } from "../lib/weather/providers/jma/classifyPixel";
import type { RainIntensityClass } from "../lib/weather/types";

const COARSE_ZOOM = Number(process.env.JMA_LOWZOOM_PARENT_ZOOM ?? "4");
const DETAIL_ZOOM = Number(process.env.JMA_LOWZOOM_DETAIL_ZOOM ?? "8");
if (!Number.isInteger(COARSE_ZOOM) || !Number.isInteger(DETAIL_ZOOM) || DETAIL_ZOOM <= COARSE_ZOOM) throw new Error("Invalid low-zoom proof zoom pair");
const SCALE = 2 ** (DETAIL_ZOOM - COARSE_ZOOM);
const BASE_Z4_TILES = [[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
const COARSE_TILES: Array<[number,number]> = BASE_Z4_TILES.flatMap(([x,y]) => {
  const scale = 2 ** (COARSE_ZOOM - 4);
  return Array.from({length: scale * scale}, (_, i) => [x * scale + (i % scale), y * scale + Math.floor(i / scale)] as [number,number]);
});
const RANK: Record<RainIntensityClass, number> = {
  LT_1: 1, "1_TO_5": 2, "5_TO_10": 3, "10_TO_20": 4,
  "20_TO_30": 5, "30_TO_50": 6, "50_TO_80": 7, GTE_80: 8,
};
const HEAVY_RANK = RANK["30_TO_50"];

type ParentStats = {
  maxDetailRank: number;
  detailHeavyPixels: number;
};

function pixelRank(png: PNG, x: number, y: number) {
  const i = (y * png.width + x) * 4;
  const c = classifyRainPixel({ r: png.data[i], g: png.data[i+1], b: png.data[i+2], a: png.data[i+3] });
  return { rank: c.intensityClass ? RANK[c.intensityClass] : 0, status: c.status, intensityClass: c.intensityClass };
}

export function parentAddress(detailTileX: number, detailTileY: number, pixelX: number, pixelY: number) {
  const worldX = detailTileX * 256 + pixelX;
  const worldY = detailTileY * 256 + pixelY;
  const parentWorldX = Math.floor(worldX / SCALE);
  const parentWorldY = Math.floor(worldY / SCALE);
  return {
    tileX: Math.floor(parentWorldX / 256),
    tileY: Math.floor(parentWorldY / 256),
    pixelX: parentWorldX % 256,
    pixelY: parentWorldY % 256,
  };
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T, index: number) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      await fn(items[index], index);
    }
  }));
}

async function main() {
  const frames = await fetchObservationTargetTimes();
  const frameIndex = Math.max(0, Number(process.env.JMA_LOWZOOM_FRAME_INDEX ?? "0"));
  const frame = frames[frameIndex];
  if (!frame) throw new Error(`No JMA observation frame at index ${frameIndex}; available=${frames.length}`);

  const coarse = new Map<string, PNG>();
  for (const [x,y] of COARSE_TILES) {
    const r = await fetch(buildJmaRainTileUrl(frame, COARSE_ZOOM, x, y));
    if (!r.ok) throw new Error(`coarse fetch failed ${x}/${y}: ${r.status}`);
    coarse.set(`${x}:${y}`, PNG.sync.read(Buffer.from(await r.arrayBuffer())));
  }

  const detailTiles: Array<[number,number]> = [];
  for (const [cx,cy] of COARSE_TILES) {
    const startX = cx * SCALE, startY = cy * SCALE;
    for (let dy=0; dy<SCALE; dy++) for (let dx=0; dx<SCALE; dx++) detailTiles.push([startX+dx,startY+dy]);
  }

  const parents = new Map<string, ParentStats>();
  let detailHeavyPixels = 0;
  let missedHeavyPixels = 0;
  let detailUnknownPixels = 0;
  const missedExamples: unknown[] = [];

  await mapLimit(detailTiles, Number(process.env.JMA_LOWZOOM_CONCURRENCY ?? "8"), async ([tx,ty]) => {
    const r = await fetch(buildJmaRainTileUrl(frame, DETAIL_ZOOM, tx, ty));
    if (!r.ok) throw new Error(`detail fetch failed ${tx}/${ty}: ${r.status}`);
    const png = PNG.sync.read(Buffer.from(await r.arrayBuffer()));
    for (let py=0; py<png.height; py++) for (let px=0; px<png.width; px++) {
      const d = pixelRank(png,px,py);
      if (d.status === "UNKNOWN_PIXEL") detailUnknownPixels++;
      const p = parentAddress(tx,ty,px,py);
      const key = `${p.tileX}:${p.tileY}:${p.pixelX}:${p.pixelY}`;
      const row = parents.get(key) ?? { maxDetailRank: 0, detailHeavyPixels: 0 };
      row.maxDetailRank = Math.max(row.maxDetailRank,d.rank);
      if (d.rank >= HEAVY_RANK) {
        row.detailHeavyPixels++;
        detailHeavyPixels++;
        const cpng = coarse.get(`${p.tileX}:${p.tileY}`);
        if (!cpng) throw new Error(`parent outside coarse coverage ${key}`);
        const c = pixelRank(cpng,p.pixelX,p.pixelY);
        if (c.rank < HEAVY_RANK) {
          missedHeavyPixels++;
          if (missedExamples.length < 20) missedExamples.push({ detailTile:[tx,ty], detailPixel:[px,py], detail:d, parent:p, coarse:c });
        }
      }
      parents.set(key,row);
    }
  });

  let comparedParents=0, coarseBelowDetailMax=0, exactMaxMatches=0, criticalParentMisses=0, coarseUnknownParents=0;
  const rankPairs: Record<string,number> = {};
  for (const [key,row] of parents) {
    const [tx,ty,px,py] = key.split(":").map(Number);
    const cpng = coarse.get(`${tx}:${ty}`)!;
    const c = pixelRank(cpng,px,py);
    comparedParents++;
    if (c.status === "UNKNOWN_PIXEL") coarseUnknownParents++;
    if (c.rank === row.maxDetailRank) exactMaxMatches++;
    if (c.rank < row.maxDetailRank) coarseBelowDetailMax++;
    if (row.maxDetailRank >= HEAVY_RANK && c.rank < HEAVY_RANK) criticalParentMisses++;
    const pair = `${row.maxDetailRank}->${c.rank}`;
    rankPairs[pair] = (rankPairs[pair] ?? 0) + 1;
  }

  const result = {
    mode: "JMA_LOW_ZOOM_MAX_RANK_PROOF",
    frame,
    frameIndex,
    availableFrames: frames.length,
    coarseZoom: COARSE_ZOOM,
    detailZoom: DETAIL_ZOOM,
    coarseTiles: COARSE_TILES.length,
    detailTiles: detailTiles.length,
    comparedParents,
    detailHeavyPixels,
    missedHeavyPixels,
    criticalParentMisses,
    coarseBelowDetailMax,
    exactMaxMatches,
    exactMaxMatchRate: comparedParents ? exactMaxMatches/comparedParents : 0,
    coarseUnknownParents,
    detailUnknownPixels,
    rankPairs,
    missedExamples,
    screeningSafeFor30mmInThisFrame: missedHeavyPixels === 0 && criticalParentMisses === 0,
    maxPoolingConfirmed: coarseBelowDetailMax === 0,
    limitation: "Selected live observation frame only. A zero-miss result is evidence for this frame and zoom pair, not a universal JMA contract. Missing required tiles fail the proof rather than being treated as dry.",
  };
  console.log(JSON.stringify(result));
  if (missedHeavyPixels > 0 || criticalParentMisses > 0) process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e=>{console.error(e);process.exitCode=1;});
