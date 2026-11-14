/** Benchmark for Issue #220: production exact matcher vs precomputed masks.
 *
 * Read-only. Builds synthetic rain tiles in memory (deterministic patterns),
 * times `municipalitiesForLightRainTile` against
 * `municipalitiesForLightRainTileWithMasks` on the same real N03 areas, and
 * asserts both return identical municipality sets for every pattern.
 *
 * Usage:
 *   npx tsx scripts/light-rain-pixel-mask-benchmark.ts <n03-root> <mask-dir> \
 *     <tileX> <tileY> --prefectures 34,35 [--zoom 10]
 *
 * Note: the production matcher keeps an in-process per-pixel decision cache
 * (64 MiB LRU), so its first call for a tile is the cold cost and later calls
 * are progressively warmer. The mask path has no such state.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { loadPreparedN03ForProof } from "../lib/weather/rain/lightRainN03LocalProof";
import type { AdministrativeArea } from "../lib/weather/rain/lightRainAdministrativeAreas";
import { municipalitiesForLightRainTile } from "../lib/weather/rain/lightRainMunicipalities";
import {
  decodeTilePixelMasks,
  municipalitiesForLightRainTileWithMasks,
} from "../lib/weather/rain/lightRainPixelMasks";

const args = process.argv.slice(2);
const [n03Root, maskDir, tileXArg, tileYArg] = args;
if (!n03Root || !maskDir || !tileXArg || !tileYArg) {
  throw new Error("Usage: <n03-root> <mask-dir> <tileX> <tileY> --prefectures 34,35 [--zoom 10]");
}
function opt(name: string, fallback: string): string {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const zoom = Number(opt("--zoom", "10"));
const tileX = Number(tileXArg), tileY = Number(tileYArg);
const prefectures = opt("--prefectures", "").split(",").map((s) => s.trim()).filter(Boolean);
if (!prefectures.length) throw new Error("--prefectures is required");

const areas: AdministrativeArea[] = [];
for (const code of prefectures) {
  areas.push(...loadPreparedN03ForProof(join(n03Root, `${code}.areas.json`), code));
}

function rainTile(seed: number, fraction: number): Buffer {
  const tile = new PNG({ width: 256, height: 256 });
  tile.data.fill(0);
  let state = seed >>> 0;
  const rand = () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let i = 0; i < 256 * 256; i++) {
    if (rand() < fraction) tile.data.set([160, 210, 255, 255], i * 4);
  }
  return PNG.sync.write(tile);
}

function main() {
  const maskPath = join(maskDir, `z${zoom}`, String(tileX), `${tileY}.bin`);
  const raw = readFileSync(maskPath);
  const decodeStarted = performance.now();
  const masks = decodeTilePixelMasks(raw);
  const decodeMs = performance.now() - decodeStarted;

  const patterns: Array<{ name: string; tile: Buffer }> = [
    { name: "all-rain", tile: rainTile(42, 1) },
    { name: "rain-30pct", tile: rainTile(7, 0.3) },
    { name: "rain-5pct", tile: rainTile(9, 0.05) },
  ];

  const results = [];
  for (const { name, tile } of patterns) {
    let t = performance.now();
    const expected = municipalitiesForLightRainTile(tile, zoom, tileX, tileY, areas);
    const productionMs = performance.now() - t;
    t = performance.now();
    const masked = municipalitiesForLightRainTileWithMasks(tile, zoom, tileX, tileY, masks, areas);
    const maskMs = performance.now() - t;
    const identical = JSON.stringify(expected) === JSON.stringify(masked);
    if (!identical) throw new Error(`RESULT MISMATCH on ${name}`);
    results.push({
      pattern: name, municipalities: expected.length,
      productionMs: Math.round(productionMs), maskMs: Math.round(maskMs * 10) / 10, identical,
    });
  }

  console.log(JSON.stringify({
    event: "PIXEL_MASK_BENCHMARK",
    tile: `${tileX}/${tileY}`, zoom, areas: areas.length,
    maskFileBytes: raw.length, maskEntries: masks.entries.length,
    decodeMs: Math.round(decodeMs * 10) / 10, results,
  }, null, 2));
}

main();
