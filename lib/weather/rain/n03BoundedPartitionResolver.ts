import { BoundedChunkCache } from "./boundedChunkCache";
import { affectedAdministrativeAreas } from "./administrativeAreas";
import type { HeavyRainPolygon } from "./nationalHeavyRain";
import type { NationalRainMunicipality } from "./nationalRainMunicipalities";
import { N03_DATASET_DATE } from "./n03Dataset";
import { createHash } from "node:crypto";

export type PartitionIndex = {
  format: "N03_POLYGON_PART_DESIGN_V1"; datasetDate: string; targetBytes: number;
  areas: { code: string; prefecture: string; municipality: string; order: number }[];
  parts: { id: number; areaOrder: number; polygonOrder: number; bbox: [number, number, number, number]; chunk: string }[];
  chunks: { file: string; bytes: number; sha256: string; partCount: number; oversized: boolean }[];
};
const sha256 = (body: string | Buffer) => createHash("sha256").update(body).digest("hex");

type Part = { id: number; areaOrder: number; polygonOrder: number; geometry: { type: "Polygon"; coordinates: number[][][] } };
export type N03PartitionDataset = { code: string; index: PartitionIndex; indexSha256: string };
const overlaps = (a: number[], b: number[]) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
function bounds(rings: number[][][]) {
  const bbox = [Infinity, Infinity, -Infinity, -Infinity];
  if (!Array.isArray(rings) || !rings.length) throw new Error("Missing polygon rings");
  for (const ring of rings) {
    if (!Array.isArray(ring) || ring.length < 4 || JSON.stringify(ring[0]) !== JSON.stringify(ring[ring.length - 1])) throw new Error("Invalid polygon ring");
    for (const xy of ring) {
      if (!Array.isArray(xy) || xy.length !== 2 || !xy.every(Number.isFinite) || Math.abs(xy[0]) > 180 || Math.abs(xy[1]) > 90) throw new Error("Invalid polygon position");
      bbox[0] = Math.min(bbox[0], xy[0]); bbox[1] = Math.min(bbox[1], xy[1]);
      bbox[2] = Math.max(bbox[2], xy[0]); bbox[3] = Math.max(bbox[3], xy[1]);
    }
  }
  return bbox;
}

export function createN03BoundedPartitionResolver(options: {
  datasets: N03PartitionDataset[];
  read: (code: string, file: string, signal?: AbortSignal) => Promise<Buffer>;
  maxWeight?: number;
  signal?: AbortSignal;
  owns?: (code: string, file: string) => boolean;
}) {
  // Retain encoded bytes only: exact cache accounting, no persistent decoded
  // geometry. Synchronous per-chunk consumption admits one JS decode at a time.
  const cache = new BoundedChunkCache<Buffer>(options.maxWeight ?? 32 * 1048576);
  const prepared = new Map<string, { code: string; index: PartitionIndex; indexSha256: string; chunks: Map<string, PartitionIndex["chunks"][number]> }>();

  function registerDataset(dataset: N03PartitionDataset) {
    const { code, index, indexSha256 } = dataset;
    if (!/^\d{2}$/.test(code)) throw new Error("Duplicate/invalid prefecture identity");
    const existing = prepared.get(code);
    if (existing) {
      if (existing.indexSha256 !== indexSha256) throw new Error("N03 partition dataset identity changed during invocation");
      return;
    }
    if (sha256(JSON.stringify(index)) !== indexSha256 || index.format !== "N03_POLYGON_PART_DESIGN_V1" || index.datasetDate !== N03_DATASET_DATE) throw new Error("Invalid partition manifest identity");
    const chunks = new Map(index.chunks.map(c => [c.file, c]));
    if (!index.areas.length || chunks.size !== index.chunks.length) throw new Error("Incomplete partition manifest");
    const areaCodes = new Set<string>();
    index.areas.forEach((area, i) => {
      if (area.order !== i || !/^\d{5}$/.test(area.code) || !area.code.startsWith(code) || areaCodes.has(area.code) || !area.prefecture || !area.municipality) throw new Error("Invalid partition area identity");
      areaCodes.add(area.code);
    });
    const ordinals = index.areas.map(() => new Set<number>());
    index.parts.forEach((part, i) => {
      if (part.id !== i || !ordinals[part.areaOrder] || !Number.isSafeInteger(part.polygonOrder) || part.polygonOrder < 0 || ordinals[part.areaOrder].has(part.polygonOrder) || !chunks.has(part.chunk) || part.bbox.length !== 4 || !part.bbox.every(Number.isFinite) || part.bbox[0] > part.bbox[2] || part.bbox[1] > part.bbox[3]) throw new Error("Invalid partition component index");
      ordinals[part.areaOrder].add(part.polygonOrder);
    });
    for (const set of ordinals) if (!set.size || [...set].some(p => p >= set.size)) throw new Error("Missing polygon ordinal");
    for (const chunk of chunks.values()) {
      if (!/^chunk-\d{4}\.json$/.test(chunk.file) || !Number.isSafeInteger(chunk.bytes) || chunk.bytes < 2 || !/^[a-f0-9]{64}$/.test(chunk.sha256) || index.parts.filter(p => p.chunk === chunk.file).length !== chunk.partCount) throw new Error("Invalid partition chunk identity");
      if (chunk.bytes > cache.maxWeight) throw new Error("Oversized chunk exceeds configured admission");
    }
    prepared.set(code, { ...dataset, chunks });
  }

  options.datasets.forEach(registerDataset);
  const metrics = { transfers: 0, transferBytes: 0, selectedBytes: 0, resolutions: 0, decodes: 0, activeDecodes: 0, peakActiveDecodes: 0 };

  async function resolve(rain: HeavyRainPolygon[], signal?: AbortSignal): Promise<NationalRainMunicipality[]> {
    const activeSignal = signal ?? options.signal;
    activeSignal?.throwIfAborted();
    metrics.resolutions++;
    const rainBounds = rain.map(p => bounds(p.coordinates));
    const results: NationalRainMunicipality[] = [];
    for (const dataset of [...prepared.values()].sort((a, b) => a.code.localeCompare(b.code))) {
      const { code, index, indexSha256, chunks } = dataset;
      const selected = index.parts.filter(p => (!options.owns || options.owns(code,p.chunk)) && rainBounds.some(b => overlaps(p.bbox, b)));
      const selectedIds = new Set(selected.map(p => p.id));
      const found = new Set<number>();
      for (const file of new Set(selected.map(p => p.chunk))) {
        activeSignal?.throwIfAborted();
        const expected = chunks.get(file)!;
        metrics.selectedBytes += expected.bytes;
        await cache.use(`${N03_DATASET_DATE}/${code}/${indexSha256}/${file}`, expected.bytes, async () => {
          const body = await options.read(code, file, activeSignal);
          metrics.transfers++; metrics.transferBytes += body.length;
          if (body.length !== expected.bytes || sha256(body) !== expected.sha256) throw new Error("Partition chunk integrity mismatch");
          return body;
        }, body => {
          activeSignal?.throwIfAborted();
          metrics.activeDecodes++; metrics.peakActiveDecodes = Math.max(metrics.peakActiveDecodes, metrics.activeDecodes); metrics.decodes++;
          try {
          const value = JSON.parse(body.toString("utf8")) as Part[];
          if (!Array.isArray(value) || value.length !== expected.partCount) throw new Error("Invalid partition chunk count");
          const ids = new Set<number>();
          for (const part of value) {
            const indexed = index.parts[part.id];
            if (!indexed || ids.has(part.id) || indexed.chunk !== file || part.areaOrder !== indexed.areaOrder || part.polygonOrder !== indexed.polygonOrder || part.geometry?.type !== "Polygon" || JSON.stringify(bounds(part.geometry.coordinates)) !== JSON.stringify(indexed.bbox)) throw new Error("Partition component identity/bounds mismatch");
            ids.add(part.id);
          }
          for (const part of value) if (selectedIds.has(part.id)) {
            const area = index.areas[part.areaOrder];
            if (affectedAdministrativeAreas(rain, [{ ...area, geometry: part.geometry }]).length) found.add(part.areaOrder);
          }
          } finally { metrics.activeDecodes--; }
        });
      }
      results.push(...index.areas.filter(a => found.has(a.order)).map(({ code, prefecture, municipality }) => ({ code, prefecture, municipality })));
    }
    return results;
  }
  return { resolve, registerDataset, cache, metrics };
}
