export type TownPolygon = number[][][];
export type TownGeometry =
  | { type: "Polygon"; coordinates: TownPolygon }
  | { type: "MultiPolygon"; coordinates: TownPolygon[] };

function signedArea(ring: number[][]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}
function validRing(ring: unknown): ring is number[][] {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  if (!ring.every((p) => Array.isArray(p) && p.length === 2 &&
    p.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    p[0] >= -180 && p[0] <= 180 && p[1] >= -90 && p[1] <= 90)) return false;
  const first = ring[0], last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1] && Math.abs(signedArea(ring)) > 1e-12;
}
function orientation(a: number[], b: number[], c: number[]) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function segmentsCross(a: number[], b: number[], c: number[], d: number[]) {
  const abC = orientation(a,b,c), abD = orientation(a,b,d);
  const cdA = orientation(c,d,a), cdB = orientation(c,d,b);
  // Collinear/touching edges require additional topology checks: reject here.
  const between = (p:number[], q:number[], r:number[]) =>
    q[0] >= Math.min(p[0],r[0]) && q[0] <= Math.max(p[0],r[0]) &&
    q[1] >= Math.min(p[1],r[1]) && q[1] <= Math.max(p[1],r[1]);
  if (abC === 0 && between(a,c,b) || abD === 0 && between(a,d,b) ||
      cdA === 0 && between(c,a,d) || cdB === 0 && between(c,b,d)) return true;
  return (abC > 0) !== (abD > 0) && (cdA > 0) !== (cdB > 0);
}
function ringSelfIntersects(ring: number[][]) {
  const edges = ring.length - 1;
  for (let i = 0; i < edges; i++) for (let j = i + 1; j < edges; j++) {
    if (j === i + 1 || (i === 0 && j === edges - 1)) continue;
    if (segmentsCross(ring[i],ring[i+1],ring[j],ring[j+1])) return true;
  }
  return false;
}
function pointInRing(p: number[], ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) &&
        p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) inside = !inside;
  }
  return inside;
}
function ringsIntersect(a: number[][], b: number[][]) {
  for (let i=0;i<a.length-1;i++) for (let j=0;j<b.length-1;j++) {
    if (segmentsCross(a[i],a[i+1],b[j],b[j+1])) return true;
  }
  return false;
}
/** Conservative offline preflight; not a complete topology or national coverage proof. */
export function validateTownGeometry(geometry: TownGeometry): void {
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
    throw new Error("Unsupported town geometry");
  }
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  if (!Array.isArray(polygons) || polygons.length === 0) throw new Error("Empty town geometry");
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) throw new Error("Empty town polygon");
    if (polygon.some((ring) => !validRing(ring) || ringSelfIntersects(ring))) {
      throw new Error("Invalid town ring");
    }
    const outer = polygon[0];
    for (let i=1;i<polygon.length;i++) {
      const hole = polygon[i];
      if (!pointInRing(hole[0],outer) || ringsIntersect(outer,hole)) {
        throw new Error("Town hole outside or touching exterior");
      }
      for (let j=1;j<i;j++) {
        if (ringsIntersect(hole,polygon[j]) || pointInRing(hole[0],polygon[j]) ||
            pointInRing(polygon[j][0],hole)) throw new Error("Town holes overlap");
      }
    }
  }
}
