import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

const file = process.argv[2];
if (!file) throw new Error("usage: tsx scripts/census-town-boundary-benchmark.ts <R2 census town/aza KML>");

const before = process.memoryUsage().heapUsed;
const source = readFileSync(file, "utf8");
const readHeap = process.memoryUsage().heapUsed;

const placemarks = source.match(/<Placemark\b[\s\S]*?<\/Placemark>/g) ?? [];
const value = (body: string, field: string) => {
  const m = body.match(new RegExp(`<SimpleData\\s+name=["']${field}["'][^>]*>([\\s\\S]*?)<\\/SimpleData>`));
  return m?.[1]?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim() ?? "";
};
const coordinateBlocks = (body: string) =>
  Array.from(body.matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/g), (m) =>
    m[1].trim().split(/\s+/).map((p) => p.split(",").slice(0, 2).map(Number) as [number, number]),
  );

const parseStart = performance.now();
const features = placemarks.map((body) => ({
  keyCode: value(body, "KEY_CODE"),
  city: value(body, "CITY"),
  cityName: value(body, "CITY_NAME"),
  name: value(body, "S_NAME"),
  duplicate: value(body, "KIGO_E"),
  hcode: value(body, "HCODE"),
  polygons: coordinateBlocks(body),
}));
const parseMs = performance.now() - parseStart;
const parsedHeap = process.memoryUsage().heapUsed;

const koto = features.filter((f) => f.city === "108" || f.city === "13108" || f.cityName === "江東区");
if (!koto.length) throw new Error("No Koto City features found; verify this is official R2 town/aza KML and field names");
const shiohama = koto.filter((f) => f.name.includes("塩浜"));
const vertices = koto.reduce((sum, f) => sum + f.polygons.reduce((n, ring) => n + ring.length, 0), 0);

const bbox = (ring: [number, number][]) => ring.reduce(
  (b, [x, y]) => ({ west: Math.min(b.west, x), south: Math.min(b.south, y), east: Math.max(b.east, x), north: Math.max(b.north, y) }),
  { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity },
);
const boxes = koto.flatMap((f) => f.polygons.map((ring) => ({ name: f.name, ...bbox(ring) })));
const probe = { west: 139.79, south: 35.65, east: 139.83, north: 35.69 };
const intersects = (a: typeof probe, b: typeof probe) => !(a.east < b.west || a.west > b.east || a.north < b.south || a.south > b.north);
const samples: number[] = [];
let matches: string[] = [];
for (let i = 0; i < 7; i++) {
  const start = performance.now();
  matches = [...new Set(boxes.filter((b) => intersects(probe, b)).map((b) => b.name))];
  samples.push(performance.now() - start);
}
samples.sort((a, b) => a - b);

console.log(JSON.stringify({
  sourceBytes: Buffer.byteLength(source),
  placemarks: placemarks.length,
  kotoFeatures: koto.length,
  kotoPolygonParts: koto.reduce((sum, f) => sum + f.polygons.length, 0),
  kotoVertices: vertices,
  shiohama: shiohama.map((f) => ({ keyCode: f.keyCode, name: f.name, duplicate: f.duplicate, hcode: f.hcode, polygonParts: f.polygons.length })),
  parseMs,
  heapDeltaAfterReadBytes: readHeap - before,
  heapDeltaAfterParseBytes: parsedHeap - before,
  bboxProbeMedianMs: samples[Math.floor(samples.length / 2)],
  bboxProbeMatches: matches,
}, null, 2));
