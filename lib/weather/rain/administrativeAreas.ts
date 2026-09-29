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

function orientation(a: Position, b: Position, c: Position) {
  return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
}

function segmentsIntersect(a: Position, b: Position, c: Position, d: Position) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return (o1 === 0 || o2 === 0 || Math.sign(o1) !== Math.sign(o2)) &&
    (o3 === 0 || o4 === 0 || Math.sign(o3) !== Math.sign(o4));
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
  return areaPolygons.some((polygon) => polygonsIntersect(rainPolygon, polygon));
}

export function affectedAdministrativeAreas(rainPolygons: HeavyRainPolygon[], areas: AdministrativeArea[]) {
  return areas.filter((area) =>
    rainPolygons.some((rain) => rainPolygonIntersectsAdministrativeArea(rain, area)),
  );
}
