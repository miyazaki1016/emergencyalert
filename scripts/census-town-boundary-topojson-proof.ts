import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { validatePreparedTownBoundaryDataset } from "../lib/weather/rain/townBoundaryDatasetValidation";
import { affectedAdministrativeAreas, type AdministrativeArea } from "../lib/weather/rain/administrativeAreas";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";

function decodeArc(topology: any, arcIndex: number): number[][] {
  const index = arcIndex >= 0 ? arcIndex : ~arcIndex;
  const encoded = topology.arcs[index] as number[][];
  const points = topology.transform
    ? (() => {
        let x = 0, y = 0;
        const [sx, sy] = topology.transform.scale;
        const [tx, ty] = topology.transform.translate;
        return encoded.map(([dx, dy]) => {
          x += dx; y += dy;
          return [x * sx + tx, y * sy + ty];
        });
      })()
    : encoded.map(([x, y]) => [x, y]);
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
  // The external town-boundary host can reset an otherwise valid CI request.
  // Retry only transport failures / transient HTTP statuses; never turn a
  // missing or invalid boundary dataset into a passing proof.
  let source: string | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) {
        if (![429, 500, 502, 503, 504].includes(response.status)) {
          throw new Error(`TopoJSON fetch failed: HTTP ${response.status} ${response.statusText}`);
        }
        if (attempt === 3) throw new Error(`TopoJSON fetch failed after 3 attempts: HTTP ${response.status}`);
        console.error(`Transient TopoJSON HTTP ${response.status}; retry ${attempt}/3`);
      } else {
        source = await response.text();
        break;
      }
    } catch (error) {
      if (attempt === 3 || (error instanceof Error && error.message.startsWith("TopoJSON fetch failed: HTTP "))) throw error;
      console.error(`Transient TopoJSON fetch error; retry ${attempt}/3:`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  if (source === undefined) throw new Error("TopoJSON fetch exhausted retries");
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
  const boundsOf = (area: AdministrativeArea) => {
    const polygons = area.geometry.type === "Polygon" ? [area.geometry.coordinates as number[][][]] : area.geometry.coordinates as number[][][][];
    const points = polygons.flatMap((polygon) => polygon.flat());
    return {
      west: Math.min(...points.map(([x]) => x)),
      south: Math.min(...points.map(([, y]) => y)),
      east: Math.max(...points.map(([x]) => x)),
      north: Math.max(...points.map(([, y]) => y)),
    };
  };
  const intersectionProof = probes.map((probe: any) => {
    const area = shiohamaAreas.find((candidate) => candidate.code === probe.keyCode);
    return {
      probe,
      decodedBounds: area ? boundsOf(area) : null,
      matches: affectedAdministrativeAreas([tinyRainAt(probe.lon, probe.lat)], shiohamaAreas).map((candidate) => candidate.code),
    };
  });
  const pointsOf = (area: AdministrativeArea) => {
    const polygons = area.geometry.type === "Polygon" ? [area.geometry.coordinates as number[][][]] : area.geometry.coordinates as number[][][][];
    return polygons.flatMap((polygon) => polygon.flat());
  };
  const first = shiohamaAreas.find((area) => area.code === "13108019001");
  const second = shiohamaAreas.find((area) => area.code === "13108019002");
  if (!first || !second) throw new Error("Expected both Shiohama town geometries");
  let closest: { a: number[]; b: number[]; distance2: number } | null = null;
  for (const a of pointsOf(first)) for (const b of pointsOf(second)) {
    const distance2 = (a[0]-b[0]) ** 2 + (a[1]-b[1]) ** 2;
    if (!closest || distance2 < closest.distance2) closest = { a, b, distance2 };
  }
  if (!closest) throw new Error("Could not find Shiohama boundary candidates");
  const boundaryProbe = {
    lon: (closest.a[0] + closest.b[0]) / 2,
    lat: (closest.a[1] + closest.b[1]) / 2,
    vertexDistance: Math.sqrt(closest.distance2),
  };
  const boundaryMatches = affectedAdministrativeAreas(
    [tinyRainAt(boundaryProbe.lon, boundaryProbe.lat, Math.max(0.00005, boundaryProbe.vertexDistance / 2 + 0.00001))],
    shiohamaAreas,
  ).map((area) => area.code).sort();
  const boundaryProof = { probe: boundaryProbe, matches: boundaryMatches };

  const arcPointCount = (topology.arcs ?? []).reduce(
    (sum: number, arc: any[]) => sum + (Array.isArray(arc) ? arc.length : 0),
    0,
  );
  
  // Read-only real-data smoke proof of the exact offline promotion gate.
  // This uses only the two selected Shiohama geometries, NOT nationwide coverage.
  const preparedPath = "2020/13108-shiohama-sample.json";
  const preparedBytes = new TextEncoder().encode(JSON.stringify({
    type: "FeatureCollection",
    features: shiohamaAreas.map((area) => ({
      type: "Feature",
      properties: { municipalityCode: "13108", townCode: area.code },
      geometry: area.geometry,
    })),
  }));
  const preparedManifest = {
    dataset: "census-2020-shiohama-sample",
    source: url,
    license: "research-only-unverified",
    version: "read-only-proof",
    expectedMunicipalityCodes: ["13108"],
    files: [{
      municipalityCode: "13108",
      path: preparedPath,
      bytes: preparedBytes.byteLength,
      sha256: createHash("sha256").update(preparedBytes).digest("hex"),
      features: shiohamaAreas.length,
    }],
  };
  // Licensing remains unverified: this proof MUST NOT promote or publish data.
  const preparedGate = validatePreparedTownBoundaryDataset(
    preparedManifest, ["13108"], new Map([[preparedPath, preparedBytes]]),
  );

  console.log(JSON.stringify({
    url,
    sourceBytes: Buffer.byteLength(source),
    preparedGate,
    preparedGateScope: "Shiohama sample only; license unverified; no national coverage or storage promotion",
    fetchMs,
    parseMs,
    heapDeltaAfterReadBytes: readHeap - before,
    heapDeltaAfterParseBytes: parsedHeap - before,
    objectNames: Object.keys(topology.objects ?? {}),
    geometries: geometries.length,
    arcs: topology.arcs?.length ?? 0,
    encodedArcPoints: arcPointCount,
    transform: topology.transform ?? null,
    intersectionProof,
    boundaryProof,
    shiohama: shiohama.map((g: any) => ({
      keyCode: keyOf(g),
      name: nameOf(g),
      geometryType: g.type,
      properties: g.properties,
    })),
  }, null, 2));
  // Keep this assertion after diagnostic output so CI preserves decoded bounds on failure.
  if (boundaryProof.matches.join(",") !== "13108019001,13108019002") {
    throw new Error(`Town boundary ambiguity proof mismatch: ${JSON.stringify(boundaryProof.matches)}`);
  }
  for (const row of intersectionProof) {
    if (row.matches.length !== 1 || row.matches[0] !== row.probe.keyCode) {
      throw new Error(`Town intersection proof mismatch for ${row.probe.name}: ${JSON.stringify(row.matches)}`);
    }
  }
  
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
