/** Generate precomputed z10 tile x N03 area pixel masks for Issue #220.
 *
 * Read-only against the prepared N03 dataset: it reads `<n03-root>/NN.areas.json`
 * files (the fixed nationwide set, Supabase bucket `national-rain-n03`,
 * version folder given by --n03-version) and writes mask artifacts plus a
 * manifest under <out-dir>. It never writes to the N03 source, the database,
 * or any production path.
 *
 * Usage:
 *   npx tsx scripts/light-rain-pixel-mask-generate.ts <n03-root> <out-dir> \
 *     [--prefectures 01,02,...] [--n03-version 20260101] [--zoom 10] \
 *     [--shard 0/4] [--skip-existing]
 *   npx tsx scripts/light-rain-pixel-mask-generate.ts --merge-manifests <out-dir>
 *
 * Generation is embarrassingly parallel: tiles are independent, so --shard
 * i/n assigns each process a disjoint slice of the sorted tile list and each
 * shard writes manifest-shard-<i>.json. --merge-manifests combines the shard
 * manifests into manifest.json. --skip-existing makes a run resumable by
 * leaving tile files that already decode with the expected header in place.
 *
 * Every pixel decision is made by the production matcher itself
 * (`affectedAdministrativeAreas`), so the artifacts are exact by
 * construction. Generation is a one-time, offline cost per N03 version.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadPreparedN03ForProof } from "../lib/weather/rain/lightRainN03LocalProof";
import type { AdministrativeArea } from "../lib/weather/rain/lightRainAdministrativeAreas";
import {
  PIXEL_MASK_ALGORITHM_VERSION,
  PIXEL_MASK_FORMAT_VERSION,
  computeAreaPixelMask,
  computeAreaPixelMaskFast,
  decodeTilePixelMasks,
  encodeTilePixelMasks,
  type TilePixelMaskEntry,
} from "../lib/weather/rain/lightRainPixelMasks";

const args = process.argv.slice(2);

if (args[0] === "--merge-manifests") {
  const dir = args[1];
  if (!dir) throw new Error("Usage: --merge-manifests <out-dir>");
  const shards = readdirSync(dir)
    .filter((name) => /^manifest-shard-\d+\.json$/.test(name))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(dir, name), "utf8")));
  if (!shards.length) throw new Error("No manifest-shard-*.json found");
  const first = shards[0];
  for (const shard of shards) {
    if (shard.formatVersion !== first.formatVersion ||
        shard.algorithmVersion !== first.algorithmVersion ||
        shard.n03Version !== first.n03Version || shard.zoom !== first.zoom) {
      throw new Error("Shard manifests disagree on format/algorithm/N03 version or zoom");
    }
  }
  const files: Record<string, { bytes: number; sha256: string }> = {};
  for (const shard of shards) Object.assign(files, shard.files);
  const merged = {
    format: first.format,
    formatVersion: first.formatVersion,
    algorithmVersion: first.algorithmVersion,
    n03Version: first.n03Version,
    zoom: first.zoom,
    generatedAt: shards.map((s) => s.generatedAt).sort()[0],
    generationMs: shards.reduce((sum, s) => sum + s.generationMs, 0),
    prefectures: first.prefectures,
    municipalities: first.municipalities,
    tiles: Object.keys(files).length,
    entries: shards.reduce((sum, s) => sum + s.entries, 0),
    totalBytes: shards.reduce((sum, s) => sum + s.totalBytes, 0),
    files,
  };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(merged, null, 2));
  console.log(JSON.stringify({ event: "PIXEL_MASK_MANIFEST_MERGED", tiles: merged.tiles, entries: merged.entries, totalBytes: merged.totalBytes }));
  process.exit(0);
}

const n03Root = args[0];
const outDir = args[1];
if (!n03Root || !outDir) throw new Error("Usage: <n03-root> <out-dir> [--prefectures ..] [--n03-version ..] [--zoom ..] [--shard i/n] [--skip-existing]");

function opt(name: string, fallback: string): string {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const n03Version = opt("--n03-version", "unknown");
const zoom = Number(opt("--zoom", "10"));
const shardSpec = opt("--shard", "");
const shardIndex = shardSpec ? Number(shardSpec.split("/")[0]) : -1;
const shardCount = shardSpec ? Number(shardSpec.split("/")[1]) : 1;
if (shardSpec && (!Number.isInteger(shardIndex) || !Number.isInteger(shardCount) ||
    shardIndex < 0 || shardIndex >= shardCount)) {
  throw new Error(`Invalid --shard ${shardSpec}`);
}
const skipExisting = args.includes("--skip-existing");
// Default is the fast exact path (segment grid + corner classification).
// --reference uses the per-pixel production-matcher path instead; both must
// produce identical masks (see the parity script).
const computeMask = args.includes("--reference") ? computeAreaPixelMask : computeAreaPixelMaskFast;
const prefectureFilter = opt("--prefectures", "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const ALL = Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, "0"));
const prefectures = prefectureFilter.length ? prefectureFilter : ALL;

type Bounds = [west: number, south: number, east: number, north: number];
function areaBounds(area: AdministrativeArea): Bounds {
  const polys = area.geometry.type === "Polygon"
    ? [area.geometry.coordinates as number[][][]]
    : area.geometry.coordinates as number[][][][];
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const p of polys) for (const ring of p) for (const [x, y] of ring) {
    w = Math.min(w, x); s = Math.min(s, y); e = Math.max(e, x); n = Math.max(n, y);
  }
  return [w, s, e, n];
}
const tileXForLon = (lon: number) => Math.floor((lon + 180) / 360 * 2 ** zoom);
const tileYForLat = (lat: number) => {
  const safe = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = safe * Math.PI / 180;
  return Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * 2 ** zoom);
};

function main() {
  const startedAt = new Date();
  const areas: AdministrativeArea[] = [];
  for (const code of prefectures) {
    const file = join(n03Root, `${code}.areas.json`);
    if (!existsSync(file)) throw new Error(`INCOMPLETE_N03: missing ${file}`);
    areas.push(...loadPreparedN03ForProof(file, code));
  }

  // Candidate tiles per area from area bounds (generation-side narrowing
  // only; every stored decision still comes from the production matcher).
  const candidates = new Map<string, { tileX: number; tileY: number; areas: AdministrativeArea[] }>();
  for (const area of areas) {
    const [w, s, e, n] = areaBounds(area);
    for (let tx = tileXForLon(w); tx <= tileXForLon(e); tx++) {
      for (let ty = tileYForLat(n); ty <= tileYForLat(s); ty++) {
        const key = `${tx}/${ty}`;
        let slot = candidates.get(key);
        if (!slot) { slot = { tileX: tx, tileY: ty, areas: [] }; candidates.set(key, slot); }
        slot.areas.push(area);
      }
    }
  }

  const sortedTiles = [...candidates.values()].sort((a, b) => a.tileX - b.tileX || a.tileY - b.tileY);
  const tiles = shardSpec
    ? sortedTiles.filter((_, i) => i % shardCount === shardIndex)
    : sortedTiles;
  const files: Record<string, { bytes: number; sha256: string }> = {};
  let totalBytes = 0;
  let totalEntries = 0;
  const generationStarted = performance.now();

  for (const { tileX, tileY, areas: tileAreas } of tiles) {
    const tileStarted = performance.now();
    const rel = join(`z${zoom}`, String(tileX), `${tileY}.bin`);
    const path = join(outDir, rel);
    if (skipExisting && existsSync(path)) {
      try {
        const existing = readFileSync(path);
        const decoded = decodeTilePixelMasks(existing);
        if (decoded.zoom === zoom && decoded.tileX === tileX && decoded.tileY === tileY) {
          files[rel] = { bytes: existing.length, sha256: createHash("sha256").update(existing).digest("hex") };
          totalBytes += existing.length;
          totalEntries += decoded.entries.length;
          console.log(JSON.stringify({
            event: "PIXEL_MASK_TILE_SKIPPED", tile: `${tileX}/${tileY}`,
            entries: decoded.entries.length, bytes: existing.length,
          }));
          continue;
        }
      } catch { /* fall through and regenerate */ }
    }
    const entries: TilePixelMaskEntry[] = [];
    for (const area of tileAreas) {
      const mask = computeMask(zoom, tileX, tileY, area);
      if (mask.some((byte) => byte !== 0)) entries.push({ code: area.code, mask });
    }
    if (!entries.length) continue;
    const encoded = encodeTilePixelMasks({ zoom, tileX, tileY, entries });
    mkdirSync(join(outDir, `z${zoom}`, String(tileX)), { recursive: true });
    writeFileSync(path, encoded);
    files[rel] = { bytes: encoded.length, sha256: createHash("sha256").update(encoded).digest("hex") };
    totalBytes += encoded.length;
    totalEntries += entries.length;
    console.log(JSON.stringify({
      event: "PIXEL_MASK_TILE_DONE", tile: `${tileX}/${tileY}`,
      candidates: tileAreas.length, entries: entries.length,
      bytes: encoded.length, ms: Math.round(performance.now() - tileStarted),
    }));
  }

  const manifest = {
    format: "light-rain-pixel-masks",
    formatVersion: PIXEL_MASK_FORMAT_VERSION,
    algorithmVersion: PIXEL_MASK_ALGORITHM_VERSION,
    n03Version,
    zoom,
    generatedAt: startedAt.toISOString(),
    generationMs: Math.round(performance.now() - generationStarted),
    prefectures,
    municipalities: areas.length,
    tiles: Object.keys(files).length,
    entries: totalEntries,
    totalBytes,
    files,
  };
  mkdirSync(outDir, { recursive: true });
  const manifestName = shardSpec ? `manifest-shard-${shardIndex}.json` : "manifest.json";
  writeFileSync(join(outDir, manifestName), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ event: "PIXEL_MASK_GENERATION_DONE", shard: shardSpec || "all", ...manifest, files: undefined }));
}

main();
