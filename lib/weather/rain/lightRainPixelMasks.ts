/**
 * Precomputed z10 tile x N03 administrative-area pixel correspondence masks.
 *
 * Independent deliverable for Issue #220. The nationwide scanner's exact
 * matcher (`municipalitiesForLightRainTile`) spends most of its time testing
 * rainy pixel footprints against coastline polygons, and the geometry never
 * changes while the N03 dataset version is fixed. This module precomputes,
 * for every pixel of a tile, whether that pixel's footprint intersects each
 * administrative area, using the production matcher itself
 * (`affectedAdministrativeAreas`) as the only decision function. Decisions
 * are therefore identical by construction: no center-point approximation, no
 * stride thinning, and boundary contact counts exactly as the production
 * geometry code decides.
 *
 * Binary format (all integers little-endian):
 *   bytes 0-3   magic "LRPM"
 *   byte  4     format version (1)
 *   byte  5     zoom
 *   bytes 6-7   reserved (0)
 *   bytes 8-11  tileX (uint32)
 *   bytes 12-15 tileY (uint32)
 *   bytes 16-19 entry count (uint32)
 *   per entry:  uint16 code byte length, code bytes (UTF-8),
 *               8192-byte pixel bitmask
 * Bit order: pixel index p = pixelY * 256 + pixelX lives at byte p >> 3,
 * bit p & 7 (least significant bit first). A set bit means the production
 * matcher judges that pixel's footprint to intersect the area.
 * Entries with an all-zero mask are never stored: an area missing from a
 * tile file intersects no pixel of that tile.
 */
import {
  affectedAdministrativeAreas,
  type AdministrativeArea,
  type HeavyRainPolygon,
} from "./lightRainAdministrativeAreas";
import { locateJmaRainPixelsAtLeast1mm } from "./lightRainProof";

export const PIXEL_MASK_FORMAT_VERSION = 1;
/** Bump when the decision semantics or footprint geometry change. */
export const PIXEL_MASK_ALGORITHM_VERSION = 1;
export const TILE_PIXELS = 256;
export const PIXELS_PER_TILE = TILE_PIXELS * TILE_PIXELS;
export const MASK_BYTES = PIXELS_PER_TILE / 8;

const MAGIC = "LRPM";
const HEADER_BYTES = 20;

export interface TilePixelMaskEntry {
  code: string;
  mask: Uint8Array;
}

export interface TilePixelMasks {
  zoom: number;
  tileX: number;
  tileY: number;
  entries: TilePixelMaskEntry[];
}

/** Pixel footprint polygon, built with the same expressions as
 * `municipalitiesForLightRainTile` so generated masks describe exactly the
 * geometry the production matcher tests. */
export function pixelFootprint(
  zoom: number, tileX: number, tileY: number, pixelX: number, pixelY: number,
): HeavyRainPolygon {
  const size = TILE_PIXELS * 2 ** zoom;
  const longitude = (x: number) => x / size * 360 - 180;
  const latitude = (y: number) => Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / size)) * 180 / Math.PI;
  const x = tileX * TILE_PIXELS + pixelX;
  const y = tileY * TILE_PIXELS + pixelY;
  const w = longitude(x), e = longitude(x + 1), n = latitude(y), s = latitude(y + 1);
  return { coordinates: [[[w, n], [e, n], [e, s], [w, s], [w, n]]] };
}

type Bounds = [west: number, south: number, east: number, north: number];

function polygonBounds(polygon: number[][][]): Bounds {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const ring of polygon) for (const [x, y] of ring) {
    west = Math.min(west, x); south = Math.min(south, y);
    east = Math.max(east, x); north = Math.max(north, y);
  }
  return [west, south, east, north];
}

/**
 * Compute the full 256x256 intersection bitmask of one area over one tile by
 * asking the production matcher about individual pixel footprints.
 *
 * Only pixels whose footprint bounds intersect one of the area's polygon
 * bounds are evaluated. Every other pixel is decided "no intersection",
 * which is exactly what the production matcher returns for it, because
 * `affectedAdministrativeAreas` applies the same bounds test before its
 * exact intersection test. The evaluated window is widened by one pixel on
 * each side so floating-point inversion can never shrink it.
 */
export function computeAreaPixelMask(
  zoom: number, tileX: number, tileY: number, area: AdministrativeArea,
): Uint8Array {
  const mask = new Uint8Array(MASK_BYTES);
  const size = TILE_PIXELS * 2 ** zoom;
  const polygons = area.geometry.type === "Polygon"
    ? [area.geometry.coordinates as number[][][]]
    : area.geometry.coordinates as number[][][][];
  const tileWest = tileX * TILE_PIXELS, tileNorth = tileY * TILE_PIXELS;

  for (const polygon of polygons) {
    const [west, south, east, north] = polygonBounds(polygon);
    // Global pixel window whose footprints can intersect these bounds.
    const gx0 = Math.max(tileWest, Math.floor((west + 180) / 360 * size) - 1);
    const gx1 = Math.min(tileWest + TILE_PIXELS - 1, Math.floor((east + 180) / 360 * size) + 1);
    const latToGy = (lat: number) => {
      const rad = Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI / 180;
      return Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * size);
    };
    const gy0 = Math.max(tileNorth, latToGy(north) - 1);
    const gy1 = Math.min(tileNorth + TILE_PIXELS - 1, latToGy(south) + 1);
    if (gx1 < gx0 || gy1 < gy0) continue;
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const pixelX = gx - tileWest, pixelY = gy - tileNorth;
        const index = pixelY * TILE_PIXELS + pixelX;
        if (mask[index >> 3] & (1 << (index & 7))) continue;
        const hit = affectedAdministrativeAreas(
          [pixelFootprint(zoom, tileX, tileY, pixelX, pixelY)], [area],
        ).length > 0;
        if (hit) mask[index >> 3] |= 1 << (index & 7);
      }
    }
  }
  return mask;
}

export function maskHasPixel(mask: Uint8Array, pixelIndex: number): boolean {
  return (mask[pixelIndex >> 3] & (1 << (pixelIndex & 7))) !== 0;
}

// --- Fast exact path --------------------------------------------------------
// `computeAreaPixelMask` calls the production matcher once per pixel, which
// is exact but slow on complex coastlines (a single tile can take minutes).
// The functions below compute the identical mask with two accelerations
// whose results are provably the same decisions, not approximations:
//
// 1. Segment grid: production `polygonsIntersect` first tests the footprint's
//    4 edges against every outer-ring segment. A segment can only intersect
//    the footprint if its bounding box overlaps the footprint's bounding box,
//    so each segment is registered in every tile cell its bounding box
//    overlaps (window widened by one pixel) and only those candidates run
//    the production segment-intersection test, verbatim.
// 2. Corner classification: production then tests whether the footprint's
//    first vertex [west, north] lies in the area polygon with a ray-casting
//    point-in-ring test. The footprint's first vertex is the pixel's
//    north-west grid corner. For a fixed corner row (fixed y), every edge's
//    ray-crossing x is a constant, so all 257x257 corner classifications of
//    a ring are computed row by row with the identical crossing formula and
//    floating-point operations, then combined exactly as `pointInPolygon`
//    combines them (inside the outer ring and outside every hole ring).
// 3. The remaining test, the area ring's first vertex inside the footprint,
//    runs the production point-in-ring loop against the 5-point footprint
//    ring unchanged.
//
// The parity script `scripts/light-rain-pixel-mask-parity.ts` verifies this
// path against `computeAreaPixelMask` on real N03 data, pixel for pixel.

const FAST_EPSILON = 1e-12;
type Pos = [number, number];

function fastCross(a: Pos, b: Pos, c: Pos): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function fastOnSegment(a: Pos, b: Pos, p: Pos): boolean {
  if (Math.abs(fastCross(a, b, p)) > FAST_EPSILON) return false;
  return p[0] >= Math.min(a[0], b[0]) - FAST_EPSILON &&
    p[0] <= Math.max(a[0], b[0]) + FAST_EPSILON &&
    p[1] >= Math.min(a[1], b[1]) - FAST_EPSILON &&
    p[1] <= Math.max(a[1], b[1]) + FAST_EPSILON;
}

function fastSegmentsIntersect(a: Pos, b: Pos, c: Pos, d: Pos): boolean {
  const abC = fastCross(a, b, c);
  const abD = fastCross(a, b, d);
  const cdA = fastCross(c, d, a);
  const cdB = fastCross(c, d, b);
  if (Math.abs(abC) <= FAST_EPSILON && fastOnSegment(a, b, c)) return true;
  if (Math.abs(abD) <= FAST_EPSILON && fastOnSegment(a, b, d)) return true;
  if (Math.abs(cdA) <= FAST_EPSILON && fastOnSegment(c, d, a)) return true;
  if (Math.abs(cdB) <= FAST_EPSILON && fastOnSegment(c, d, b)) return true;
  return (abC > FAST_EPSILON) !== (abD > FAST_EPSILON) &&
    (cdA > FAST_EPSILON) !== (cdB > FAST_EPSILON);
}

function fastPointInRing([x, y]: Pos, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

const CORNERS = TILE_PIXELS + 1;

/** Classify every tile grid corner against one ring with the production
 * ray-casting predicate, hoisting each edge's crossing x per corner row. */
function classifyRingCorners(
  ring: number[][], cornerLons: Float64Array, cornerLats: Float64Array,
): Uint8Array {
  const result = new Uint8Array(CORNERS * CORNERS);
  const crossings: number[] = [];
  for (let cy = 0; cy < CORNERS; cy++) {
    const y = cornerLats[cy];
    crossings.length = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y) {
        crossings.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
      }
    }
    if (!crossings.length) continue;
    crossings.sort((a, b) => a - b);
    // Sweep corners from east to west: inside iff an odd number of
    // crossings have crossing-x greater than the corner's x.
    let remaining = crossings.length;
    let inside = false;
    for (let cx = CORNERS - 1; cx >= 0; cx--) {
      const x = cornerLons[cx];
      while (remaining > 0 && crossings[remaining - 1] > x) {
        inside = !inside;
        remaining--;
      }
      if (inside) result[cy * CORNERS + cx] = 1;
    }
  }
  return result;
}

export function computeAreaPixelMaskFast(
  zoom: number, tileX: number, tileY: number, area: AdministrativeArea,
): Uint8Array {
  const mask = new Uint8Array(MASK_BYTES);
  const size = TILE_PIXELS * 2 ** zoom;
  const longitude = (x: number) => x / size * 360 - 180;
  const latitude = (y: number) => Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / size)) * 180 / Math.PI;
  const tileWest = tileX * TILE_PIXELS, tileNorth = tileY * TILE_PIXELS;
  const cornerLons = new Float64Array(CORNERS);
  const cornerLats = new Float64Array(CORNERS);
  for (let i = 0; i < CORNERS; i++) {
    cornerLons[i] = longitude(tileWest + i);
    cornerLats[i] = latitude(tileNorth + i);
  }
  const latToGy = (lat: number) => {
    const rad = Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI / 180;
    return Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * size);
  };
  const polygons = area.geometry.type === "Polygon"
    ? [area.geometry.coordinates as number[][][]]
    : area.geometry.coordinates as number[][][][];

  for (const polygon of polygons) {
    const outer = polygon[0];
    if (!outer || outer.length === 0) continue;
    const [west, south, east, north] = polygonBounds(polygon);
    const gx0 = Math.max(tileWest, Math.floor((west + 180) / 360 * size) - 1);
    const gx1 = Math.min(tileWest + TILE_PIXELS - 1, Math.floor((east + 180) / 360 * size) + 1);
    const gy0 = Math.max(tileNorth, latToGy(north) - 1);
    const gy1 = Math.min(tileNorth + TILE_PIXELS - 1, latToGy(south) + 1);
    if (gx1 < gx0 || gy1 < gy0) continue;

    // Corner classification for pointInPolygon(footprint NW corner, polygon).
    const inPoly = classifyRingCorners(outer, cornerLons, cornerLats);
    for (const hole of polygon.slice(1)) {
      const inHole = classifyRingCorners(hole, cornerLons, cornerLats);
      for (let i = 0; i < inPoly.length; i++) if (inHole[i]) inPoly[i] = 0;
    }

    // Segment grid over tile cells (outer ring only, as in production).
    const segAx: number[] = [], segAy: number[] = [], segBx: number[] = [], segBy: number[] = [];
    const grid = new Map<number, number[]>();
    for (let k = 1; k < outer.length; k++) {
      const a = outer[k - 1], b = outer[k];
      const segIndex = segAx.length;
      segAx.push(a[0]); segAy.push(a[1]); segBx.push(b[0]); segBy.push(b[1]);
      const sx0 = Math.max(tileWest, Math.floor((Math.min(a[0], b[0]) + 180) / 360 * size) - 1);
      const sx1 = Math.min(tileWest + TILE_PIXELS - 1, Math.floor((Math.max(a[0], b[0]) + 180) / 360 * size) + 1);
      const sy0 = Math.max(tileNorth, latToGy(Math.max(a[1], b[1])) - 1);
      const sy1 = Math.min(tileNorth + TILE_PIXELS - 1, latToGy(Math.min(a[1], b[1])) + 1);
      for (let gy = sy0; gy <= sy1; gy++) {
        for (let gx = sx0; gx <= sx1; gx++) {
          const cell = (gy - tileNorth) * TILE_PIXELS + (gx - tileWest);
          const list = grid.get(cell);
          if (list) list.push(segIndex); else grid.set(cell, [segIndex]);
        }
      }
    }

    const areaVertex = outer[0] as Pos;
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const pixelX = gx - tileWest, pixelY = gy - tileNorth;
        const index = pixelY * TILE_PIXELS + pixelX;
        if (mask[index >> 3] & (1 << (index & 7))) continue;
        const w = longitude(gx), e = longitude(gx + 1);
        const n = latitude(gy), s = latitude(gy + 1);
        let hit = false;
        const candidates = grid.get(index);
        if (candidates) {
          const f: Pos[] = [[w, n], [e, n], [e, s], [w, s], [w, n]];
          outer: for (const segIndex of candidates) {
            const c: Pos = [segAx[segIndex], segAy[segIndex]];
            const d: Pos = [segBx[segIndex], segBy[segIndex]];
            for (let k = 1; k < f.length; k++) {
              if (fastSegmentsIntersect(f[k - 1], f[k], c, d)) { hit = true; break outer; }
            }
          }
        }
        if (!hit && inPoly[pixelY * CORNERS + pixelX]) hit = true;
        if (!hit && fastPointInRing(areaVertex, [[w, n], [e, n], [e, s], [w, s], [w, n]])) hit = true;
        if (hit) mask[index >> 3] |= 1 << (index & 7);
      }
    }
  }
  return mask;
}

export function encodeTilePixelMasks(tile: TilePixelMasks): Buffer {
  const entries = tile.entries.filter((entry) => entry.mask.some((byte) => byte !== 0));
  let total = HEADER_BYTES;
  const codeBytes = entries.map((entry) => Buffer.from(entry.code, "utf8"));
  for (const bytes of codeBytes) total += 2 + bytes.length + MASK_BYTES;
  const out = Buffer.alloc(total);
  out.write(MAGIC, 0, "ascii");
  out.writeUInt8(PIXEL_MASK_FORMAT_VERSION, 4);
  out.writeUInt8(tile.zoom, 5);
  out.writeUInt16LE(0, 6);
  out.writeUInt32LE(tile.tileX, 8);
  out.writeUInt32LE(tile.tileY, 12);
  out.writeUInt32LE(entries.length, 16);
  let offset = HEADER_BYTES;
  entries.forEach((entry, i) => {
    out.writeUInt16LE(codeBytes[i].length, offset);
    offset += 2;
    codeBytes[i].copy(out, offset);
    offset += codeBytes[i].length;
    out.set(entry.mask, offset);
    offset += MASK_BYTES;
  });
  return out;
}

/** Strict decoder. Any inconsistency throws, so a corrupt or stale artifact
 * fails closed instead of silently producing wrong municipalities. */
export function decodeTilePixelMasks(buffer: Buffer): TilePixelMasks {
  if (buffer.length < HEADER_BYTES || buffer.toString("ascii", 0, 4) !== MAGIC) {
    throw new Error("PIXEL_MASK_BAD_MAGIC");
  }
  if (buffer.readUInt8(4) !== PIXEL_MASK_FORMAT_VERSION) {
    throw new Error("PIXEL_MASK_UNSUPPORTED_FORMAT_VERSION");
  }
  const zoom = buffer.readUInt8(5);
  const tileX = buffer.readUInt32LE(8);
  const tileY = buffer.readUInt32LE(12);
  const count = buffer.readUInt32LE(16);
  const entries: TilePixelMaskEntry[] = [];
  let offset = HEADER_BYTES;
  for (let i = 0; i < count; i++) {
    if (offset + 2 > buffer.length) throw new Error("PIXEL_MASK_TRUNCATED");
    const codeLength = buffer.readUInt16LE(offset);
    offset += 2;
    if (offset + codeLength + MASK_BYTES > buffer.length) throw new Error("PIXEL_MASK_TRUNCATED");
    const code = buffer.toString("utf8", offset, offset + codeLength);
    offset += codeLength;
    const mask = new Uint8Array(MASK_BYTES);
    mask.set(buffer.subarray(offset, offset + MASK_BYTES));
    offset += MASK_BYTES;
    entries.push({ code, mask });
  }
  if (offset !== buffer.length) throw new Error("PIXEL_MASK_TRAILING_BYTES");
  return { zoom, tileX, tileY, entries };
}

/**
 * Drop-in counterpart of `municipalitiesForLightRainTile` driven by
 * precomputed masks. Rain pixel extraction is shared with the production
 * matcher, and the result order follows the `areas` argument exactly.
 * Throws when no mask set is supplied for the tile, so the caller decides
 * the fallback (the exact matcher) instead of receiving a silent empty
 * result for a tile the artifact does not cover.
 */
export function municipalitiesForLightRainTileWithMasks(
  tile: Buffer, zoom: number, tileX: number, tileY: number,
  tileMasks: TilePixelMasks | undefined, areas: AdministrativeArea[],
): Array<Pick<AdministrativeArea, "code" | "prefecture" | "municipality">> {
  const pixels = locateJmaRainPixelsAtLeast1mm(tile, zoom, tileX, tileY);
  if (!pixels.length || !areas.length) return [];
  if (!tileMasks || tileMasks.zoom !== zoom || tileMasks.tileX !== tileX || tileMasks.tileY !== tileY) {
    throw new Error(`PIXEL_MASK_MISSING: z${zoom}/${tileX}/${tileY}`);
  }
  const byCode = new Map(tileMasks.entries.map((entry) => [entry.code, entry.mask]));
  const matched: Array<Pick<AdministrativeArea, "code" | "prefecture" | "municipality">> = [];
  for (const area of areas) {
    const mask = byCode.get(area.code);
    if (!mask) continue;
    for (const { pixelX, pixelY } of pixels) {
      if (maskHasPixel(mask, pixelY * TILE_PIXELS + pixelX)) {
        matched.push({ code: area.code, prefecture: area.prefecture, municipality: area.municipality });
        break;
      }
    }
  }
  return matched;
}
