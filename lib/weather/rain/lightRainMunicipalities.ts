import { affectedAdministrativeAreas, type AdministrativeArea, type HeavyRainPolygon } from "./lightRainAdministrativeAreas";
import { locateJmaRainPixelsAtLeast1mm } from "./lightRainProof";

// Cache exact pixel-footprint intersections across forecast frames. Values:
// 0 = not evaluated, 1 = no intersection, 2 = intersects.
// Bound memory to 64 MiB; cache keys include area identity and tile coordinates.
const MAX_MASK_BYTES = 64 * 1024 * 1024;
const PIXELS_PER_TILE = 256 * 256;
const masks = new Map<string, { area: AdministrativeArea; values: Uint8Array }>();
let maskBytes = 0;
const areaIds = new WeakMap<AdministrativeArea, number>();
let nextAreaId = 0;
function areaId(area: AdministrativeArea): number {
  let id = areaIds.get(area);
  if (id === undefined) { id = ++nextAreaId; areaIds.set(area, id); }
  return id;
}
function pixelMask(area: AdministrativeArea, zoom: number, tileX: number, tileY: number): Uint8Array {
  const key = `${areaId(area)}:${zoom}:${tileX}:${tileY}`;
  const existing = masks.get(key);
  if (existing && existing.area === area) {
    masks.delete(key);
    masks.set(key, existing);
    return existing.values;
  }
  while (maskBytes + PIXELS_PER_TILE > MAX_MASK_BYTES) {
    const oldest = masks.keys().next().value;
    if (oldest === undefined) break;
    masks.delete(oldest);
    maskBytes -= PIXELS_PER_TILE;
  }
  const values = new Uint8Array(PIXELS_PER_TILE);
  masks.set(key, { area, values });
  maskBytes += PIXELS_PER_TILE;
  return values;
}

/** Proof-only N03 municipality intersection; every rainy pixel's entire
 * footprint is tested, including edges and holes. No stride or center shortcut.
 * Cached decisions are exact results from the existing geometry matcher.
 */
export function municipalitiesForLightRainTile(
  tile: Buffer, zoom: number, tileX: number, tileY: number, areas: AdministrativeArea[],
): Array<Pick<AdministrativeArea, "code" | "prefecture" | "municipality">> {
  const pixels = locateJmaRainPixelsAtLeast1mm(tile, zoom, tileX, tileY);
  if (!pixels.length || !areas.length) return [];
  const size = 256 * 2 ** zoom;
  const longitude = (x: number) => x / size * 360 - 180;
  const latitude = (y: number) => Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / size)) * 180 / Math.PI;
  const footprint = new Map<number, HeavyRainPolygon>();
  function rainFootprint(pixelX: number, pixelY: number): HeavyRainPolygon {
    const index = pixelY * 256 + pixelX;
    const cached = footprint.get(index);
    if (cached) return cached;
    const x = tileX * 256 + pixelX, y = tileY * 256 + pixelY;
    const w = longitude(x), e = longitude(x + 1), n = latitude(y), s = latitude(y + 1);
    const polygon: HeavyRainPolygon = { coordinates: [[[w, n], [e, n], [e, s], [w, s], [w, n]]] };
    footprint.set(index, polygon);
    return polygon;
  }
  const matched: Array<Pick<AdministrativeArea, "code" | "prefecture" | "municipality">> = [];
  for (const area of areas) {
    const mask = pixelMask(area, zoom, tileX, tileY);
    let hit = false;
    for (const { pixelX, pixelY } of pixels) {
      const index = pixelY * 256 + pixelX;
      let decision = mask[index];
      if (decision === 0) {
        decision = affectedAdministrativeAreas([rainFootprint(pixelX, pixelY)], [area]).length ? 2 : 1;
        mask[index] = decision;
      }
      if (decision === 2) { hit = true; break; }
    }
    if (hit) matched.push({ code: area.code, prefecture: area.prefecture, municipality: area.municipality });
  }
  return matched;
}
