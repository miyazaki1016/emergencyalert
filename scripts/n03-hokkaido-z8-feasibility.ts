// Offline Hokkaido z8 spatial packing feasibility proof; no polygon clipping or Storage writes.
// Reports bbox-indexed whole-polygon duplication as an upper-bound baseline, NOT an exact clipped-tile implementation.
import { readFileSync } from "node:fs";
import type { AdministrativeArea } from "../lib/weather/rain/administrativeAreas";

const DEFAULT_ZOOMS = [8, 9, 10] as const;
let Z = 8, N = 2 ** Z;
const clamp = (v: number) => Math.max(0, Math.min(N - 1, v));
function tileX(lon: number) { return clamp(Math.floor((lon + 180) / 360 * N)); }
function tileY(lat: number) {
  const radians = Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI / 180;
  return clamp(Math.floor((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * N));
}
function bbox(coordinates: number[][][]) {
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const ring of coordinates) for (const [lon, lat] of ring) {
    west = Math.min(west, lon); east = Math.max(east, lon);
    south = Math.min(south, lat); north = Math.max(north, lat);
  }
  return { west, east, south, north };
}
function percentile(values: number[], fraction: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(fraction * sorted.length) - 1];
}
export function analyzeZ8Hokkaido(areas: AdministrativeArea[], zoom = 8) {
  if (![8,9,10].includes(zoom)) throw new Error("Only z8/z9/z10 supported");
  Z=zoom; N=2 ** Z;
  const tileBytes = new Map<string, number>(), tileParts = new Map<string, number>();
  let sourcePolygonBytes = 0, polygonParts = 0, largestPolygonBytes = 0, tileReferences = 0;
  let largestPolygon: { code: string; bytes: number; tileReferences: number } | undefined;
  for (const area of areas) {
    if (area.prefecture !== "北海道" || !area.code.startsWith("01")) throw new Error("Expected Hokkaido only");
    const polygons = area.geometry.type === "Polygon" ? [area.geometry.coordinates as number[][][]] : area.geometry.coordinates as number[][][][];
    for (const polygon of polygons) {
      const bytes = Buffer.byteLength(JSON.stringify(polygon));
      const {west,east,south,north} = bbox(polygon);
      const minX=tileX(west), maxX=tileX(east), minY=tileY(north), maxY=tileY(south);
      const count=(maxX-minX+1)*(maxY-minY+1);
      if (!Number.isFinite(count) || count <= 0 || count > 65536) throw new Error("Invalid polygon bounds");
      polygonParts++; sourcePolygonBytes+=bytes; tileReferences+=count;
      if (bytes > largestPolygonBytes) { largestPolygonBytes=bytes;largestPolygon={code:area.code,bytes,tileReferences:count}; }
      for (let y=minY;y<=maxY;y++) for (let x=minX;x<=maxX;x++) {
        const key=`${x}/${y}`;
        tileBytes.set(key,(tileBytes.get(key)??0)+bytes);
        tileParts.set(key,(tileParts.get(key)??0)+1);
      }
    }
  }
  const values=[...tileBytes.values()];
  const totalDuplicatedBytes=values.reduce((sum,value)=>sum+value,0);
  const largestTiles=[...tileBytes].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([tile,bytes])=>({tile,bytes,polygonReferences:tileParts.get(tile)}));
  return { mode:"N03_HOKKAIDO_TILE_BBOX_DUPLICATION_BASELINE", z:Z, municipalities:areas.length,
    polygonParts, occupiedTiles:tileBytes.size, tileReferences, sourcePolygonBytes,
    totalDuplicatedBytes, duplicationFactor:sourcePolygonBytes?totalDuplicatedBytes/sourcePolygonBytes:0,
    tileBytes:{median:percentile(values,0.5),p95:percentile(values,0.95),max:Math.max(0,...values)},
    tilesOver1MiB:values.filter(v=>v>1048576).length, largestPolygon, largestTiles,
    limitations:["Whole polygon repeated for every intersecting bbox tile: conservative storage/transfer baseline, NOT geometric clipping.",
      "BBox overlap can include tiles without actual geometry; results are not exact spatial intersections.",
      "No boundary clipping, municipality equivalence proof, HTTP latency, 45s worker proof or Production changes."],
    decision:"EXPERIMENT_ONLY_NOT_ADOPTED" };
}
if (process.argv[1]?.endsWith("n03-hokkaido-z8-feasibility.ts")) {
  const path=process.argv[2];
  if (!path) throw new Error("Usage: npx tsx scripts/n03-hokkaido-z8-feasibility.ts <01.areas.json>");
  const areas=JSON.parse(readFileSync(path,"utf8")) as AdministrativeArea[];
  for (const zoom of DEFAULT_ZOOMS) console.log(JSON.stringify(analyzeZ8Hokkaido(areas, zoom)));
}
