/**
 * Parity check (Issue #220 deliverable): the fast mask path
 * (`computeAreaPixelMaskFast`) must produce byte-identical masks to the
 * reference path (`computeAreaPixelMask`, which asks the production matcher
 * about every pixel) on real N03 data.
 *
 * Usage:
 *   npx tsx scripts/light-rain-pixel-mask-parity.ts <n03-root> <tileX> <tileY> \
 *     --prefectures 34,35 [--zoom 10]
 *
 * Prints one JSON line per area and a summary; exits 1 on any difference.
 */
import { join } from "node:path";
import { loadPreparedN03ForProof } from "../lib/weather/rain/lightRainN03LocalProof";
import type { AdministrativeArea } from "../lib/weather/rain/lightRainAdministrativeAreas";
import {
  computeAreaPixelMask,
  computeAreaPixelMaskFast,
} from "../lib/weather/rain/lightRainPixelMasks";

const args = process.argv.slice(2);
const n03Root = args[0];
const tileX = Number(args[1]);
const tileY = Number(args[2]);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const zoom = Number(opt("--zoom", "10"));
const prefectures = opt("--prefectures", "").split(",").filter(Boolean);
if (!n03Root || !Number.isInteger(tileX) || !Number.isInteger(tileY) || !prefectures.length) {
  throw new Error("Usage: <n03-root> <tileX> <tileY> --prefectures 34,35 [--zoom 10]");
}

const size = 256 * 2 ** zoom;
function areaOverlapsTile(area: AdministrativeArea): boolean {
  const polys = area.geometry.type === "Polygon"
    ? [area.geometry.coordinates as number[][][]]
    : area.geometry.coordinates as number[][][][];
  for (const polygon of polys) {
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    for (const ring of polygon) for (const [x, y] of ring) {
      west = Math.min(west, x); south = Math.min(south, y);
      east = Math.max(east, x); north = Math.max(north, y);
    }
    const gx0 = Math.floor((west + 180) / 360 * size) - 1;
    const gx1 = Math.floor((east + 180) / 360 * size) + 1;
    const latToGy = (lat: number) => {
      const rad = Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI / 180;
      return Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * size);
    };
    const gy0 = latToGy(north) - 1, gy1 = latToGy(south) + 1;
    if (gx1 >= tileX * 256 && gx0 <= tileX * 256 + 255 && gy1 >= tileY * 256 && gy0 <= tileY * 256 + 255) {
      return true;
    }
  }
  return false;
}

function main() {
  const candidates: AdministrativeArea[] = [];
  for (const prefCode of prefectures) {
    const areas = loadPreparedN03ForProof(join(n03Root, `${prefCode}.areas.json`), prefCode);
    for (const area of areas) if (areaOverlapsTile(area)) candidates.push(area);
  }
  console.log(JSON.stringify({ event: "PIXEL_MASK_PARITY_START", tile: `${tileX}/${tileY}`, candidates: candidates.length }));
  let mismatches = 0;
  for (const area of candidates) {
    const started = performance.now();
    const reference = computeAreaPixelMask(zoom, tileX, tileY, area);
    const referenceMs = performance.now() - started;
    const fastStarted = performance.now();
    const fast = computeAreaPixelMaskFast(zoom, tileX, tileY, area);
    const fastMs = performance.now() - fastStarted;
    let differingPixels = 0;
    for (let i = 0; i < reference.length; i++) {
      const diff = reference[i] ^ fast[i];
      for (let bit = 0; bit < 8; bit++) if (diff & (1 << bit)) differingPixels++;
    }
    if (differingPixels > 0) mismatches++;
    console.log(JSON.stringify({
      event: "PIXEL_MASK_PARITY_AREA", code: area.code, municipality: area.municipality,
      differingPixels, referenceMs: Math.round(referenceMs), fastMs: Math.round(fastMs),
    }));
  }
  console.log(JSON.stringify({ event: "PIXEL_MASK_PARITY_DONE", tile: `${tileX}/${tileY}`, candidates: candidates.length, mismatches }));
  if (mismatches > 0) process.exit(1);
}

main();
