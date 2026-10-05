import { performance } from "node:perf_hooks";

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
