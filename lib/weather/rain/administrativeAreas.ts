import type { HeavyRainPolygon } from "./nationalHeavyRain";

export interface AdministrativeArea {
  code: string;
  prefecture: string;
  municipality: string;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

type Position = [number, number];
type Bounds = [west: number, south: number, east: number, north: number];

function polygonBounds(polygon: number[][][]): Bounds {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const ring of polygon) for (const [x, y] of ring) {
    west = Math.min(west, x); south = Math.min(south, y);
    east = Math.max(east, x); north = Math.max(north, y);
  }
  return [west, south, east, north];
}

function boundsIntersect(a: Bounds, b: Bounds) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function pointInRing([x, y]: Position, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: Position, polygon: number[][][]) {
  if (!polygon[0] || !pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

const EPSILON = 1e-12;

function cross(a: Position, b: Position, c: Position) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(a: Position, b: Position, p: Position) {
  if (Math.abs(cross(a, b, p)) > EPSILON) return false;
  return p[0] >= Math.min(a[0], b[0]) - EPSILON &&
    p[0] <= Math.max(a[0], b[0]) + EPSILON &&
    p[1] >= Math.min(a[1], b[1]) - EPSILON &&
    p[1] <= Math.max(a[1], b[1]) + EPSILON;
}

function segmentsIntersect(a: Position, b: Position, c: Position, d: Position) {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);

  if (Math.abs(abC) <= EPSILON && onSegment(a, b, c)) return true;
  if (Math.abs(abD) <= EPSILON && onSegment(a, b, d)) return true;
  if (Math.abs(cdA) <= EPSILON && onSegment(c, d, a)) return true;
  if (Math.abs(cdB) <= EPSILON && onSegment(c, d, b)) return true;

  return (abC > EPSILON) !== (abD > EPSILON) &&
    (cdA > EPSILON) !== (cdB > EPSILON);
}

function ringsIntersect(a: number[][], b: number[][]) {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      if (segmentsIntersect(a[i - 1] as Position, a[i] as Position, b[j - 1] as Position, b[j] as Position)) return true;
    }
  }
  return false;
}

function polygonsIntersect(a: number[][][], b: number[][][]) {
  const ar = a[0], br = b[0];
  if (!ar || !br) return false;
  return ringsIntersect(ar, br) ||
    pointInPolygon(ar[0] as Position, b) ||
    pointInPolygon(br[0] as Position, a);
}

export function rainPolygonIntersectsAdministrativeArea(rain: HeavyRainPolygon, area: AdministrativeArea) {
  const rainPolygon = rain.coordinates;
  const areaPolygons = area.geometry.type === "Polygon"
    ? [area.geometry.coordinates as number[][][]]
    : area.geometry.coordinates as number[][][][];
  const rainBounds = polygonBounds(rainPolygon);
  return areaPolygons.some((polygon) =>
    boundsIntersect(rainBounds, polygonBounds(polygon)) && polygonsIntersect(rainPolygon, polygon),
  );
}

export function affectedAdministrativeAreas(rainPolygons: HeavyRainPolygon[], areas: AdministrativeArea[]) {
  const rainWithBounds = rainPolygons.map((rain) => ({
    rain,
    bounds: polygonBounds(rain.coordinates),
  }));
  const areasWithBounds = areas.map((area) => {
    const polygons = area.geometry.type === "Polygon"
      ? [area.geometry.coordinates as number[][][]]
      : area.geometry.coordinates as number[][][][];
    return {
      area,
      polygons: polygons.map((polygon) => ({
        polygon,
        bounds: polygonBounds(polygon),
      })),
    };
  });

  return areasWithBounds
    .filter(({ polygons }) =>
      rainWithBounds.some(({ rain, bounds: rainBounds }) =>
        polygons.some(({ polygon, bounds: areaBounds }) =>
          boundsIntersect(rainBounds, areaBounds) &&
          polygonsIntersect(rain.coordinates, polygon),
        ),
      ),
    )
    .map(({ area }) => area);
}
