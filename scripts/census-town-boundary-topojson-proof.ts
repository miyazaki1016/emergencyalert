import { performance } from "node:perf_hooks";
import { affectedAdministrativeAreas, type AdministrativeArea } from "../lib/weather/rain/administrativeAreas";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";

function decodeArc(topology: any, arcIndex: number): number[][] {
  const index = arcIndex >= 0 ? arcIndex : ~arcIndex;
  const encoded = topology.arcs[index] as number[][];
  let x = 0, y = 0;
  const points = encoded.map(([dx, dy]) => {
    x += dx; y += dy;
    const scale = topology.transform?.scale ?? [1, 1];
    const translate = topology.transform?.translate ?? [0, 0];
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
  return arcIndex >= 0 ? points : points.reverse();
}

function stitchRing(topology: any, arcIndexes: number[]): number[][] {
  const ring: number[][] = [];
  for (const arcIndex of arcIndexes) {
    const arc = decodeArc(topology, arcIndex);
    ring.push(...(ring.length ? arc.slice(1) : arc));
  }
  return ring;
}

function geometryCoordinates(topology: any, geometry: any): number[][][] | number[][][][] {
  if (geometry.type === "Polygon") return geometry.arcs.map((ring: number[]) => stitchRing(topology, ring));
  if (geometry.type === "MultiPolygon") return geometry.arcs.map((polygon: number[][]) => polygon.map((ring: number[]) => stitchRing(topology, ring)));
  throw new Error(`Unsupported town geometry: ${geometry.type}`);
}

function tinyRainAt(lon: number, lat: number, d = 0.00005): HeavyRainPolygon {
  return { type: "Polygon", coordinates: [[[lon-d,lat-d],[lon+d,lat-d],[lon+d,lat+d],[lon-d,lat+d],[lon-d,lat-d]]] };
}

async function main() {
  const DEFAULT_URL = "https://geoshape.ex.nii.ac.jp/ka/topojson/2020/13/r2ka13108.topojson";
  const url = process.argv[2] ?? DEFAULT_URL;
  
  const before = process.memoryUsage().heapUsed;
  const fetchStart = performance.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`TopoJSON fetch failed: HTTP ${response.status} ${response.statusText}`);
  const source = await response.text();
  const fetchMs = performance.now() - fetchStart;
  const readHeap = process.memoryUsage().heapUsed;
  
  const parseStart = performance.now();
  const topology = JSON.parse(source);
  const parseMs = performance.now() - parseStart;
  const parsedHeap = process.memoryUsage().heapUsed;
  
  if (topology?.type !== "Topology") throw new Error("Expected TopoJSON Topology");
  const objects = Object.values(topology.objects ?? {}) as any[];
  const geometries = objects.flatMap((object: any) =>
    object?.type === "GeometryCollection" ? object.geometries ?? [] : [object],
  );
  const prop = (g: any, ...keys: string[]) => {
    for (const key of keys) if (g?.properties?.[key] != null) return String(g.properties[key]);
    return "";
  };
  const nameOf = (g: any) => prop(g, "S_NAME", "name", "N03_004");
  const keyOf = (g: any) => prop(g, "KEY_CODE", "key_code", "code");
  const shiohama = geometries.filter((g: any) => nameOf(g).includes("塩浜"));
  const shiohamaAreas: AdministrativeArea[] = shiohama.map((g: any) => ({
    code: keyOf(g),
    prefecture: prop(g, "PREF_NAME"),
    municipality: prop(g, "CITY_NAME"),
    geometry: { type: g.type, coordinates: geometryCoordinates(topology, g) } as AdministrativeArea["geometry"],
  }));
  const probes = shiohama.map((g: any) => ({
    keyCode: keyOf(g),
    name: nameOf(g),
    lon: Number(g.properties?.X_CODE),
    lat: Number(g.properties?.Y_CODE),
  })).filter((p: any) => Number.isFinite(p.lon) && Number.isFinite(p.lat));
  const intersectionProof = probes.map((probe: any) => ({
    probe,
    matches: affectedAdministrativeAreas([tinyRainAt(probe.lon, probe.lat)], shiohamaAreas).map((area) => area.code),
  }));
  for (const row of intersectionProof) {
    if (row.matches.length !== 1 || row.matches[0] !== row.probe.keyCode) {
      throw new Error(`Town intersection proof mismatch for ${row.probe.name}: ${JSON.stringify(row.matches)}`);
    }
  }
  
  const arcPointCount = (topology.arcs ?? []).reduce(
    (sum: number, arc: any[]) => sum + (Array.isArray(arc) ? arc.length : 0),
    0,
  );
  
  console.log(JSON.stringify({
    url,
    sourceBytes: Buffer.byteLength(source),
    fetchMs,
    parseMs,
    heapDeltaAfterReadBytes: readHeap - before,
    heapDeltaAfterParseBytes: parsedHeap - before,
    objectNames: Object.keys(topology.objects ?? {}),
    geometries: geometries.length,
    arcs: topology.arcs?.length ?? 0,
    encodedArcPoints: arcPointCount,
    intersectionProof,
    shiohama: shiohama.map((g: any) => ({
      keyCode: keyOf(g),
      name: nameOf(g),
      geometryType: g.type,
      properties: g.properties,
    })),
  }, null, 2));
  
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
