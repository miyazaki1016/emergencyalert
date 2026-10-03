import type { HeavyRainPolygon } from "./nationalHeavyRain";

export interface N03PrefectureIndexEntry {
  code: string;
  name: string;
  bbox: [west: number, south: number, east: number, north: number];
}

function polygonBbox(polygon: HeavyRainPolygon): [number, number, number, number] {
  const ring = polygon.coordinates[0] ?? [];
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const [lon, lat] of ring) {
    west = Math.min(west, lon); south = Math.min(south, lat);
    east = Math.max(east, lon); north = Math.max(north, lat);
  }
  return [west, south, east, north];
}

function intersects(a: [number, number, number, number], b: [number, number, number, number]) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

export function prefecturesForRainPolygons(polygons: HeavyRainPolygon[], index: N03PrefectureIndexEntry[]) {
  const selected = new Map<string, N03PrefectureIndexEntry>();
  for (const polygon of polygons) {
    const bbox = polygonBbox(polygon);
    if (!Number.isFinite(bbox[0])) continue;
    for (const prefecture of index) {
      if (intersects(bbox, prefecture.bbox)) selected.set(prefecture.code, prefecture);
    }
  }
  return [...selected.values()];
}
