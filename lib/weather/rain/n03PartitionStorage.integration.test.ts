import { expect, test, vi } from "vitest";
import { partitionAreas, sha256 } from "../../../scripts/n03-partition-design-core";
import { createN03BoundedPartitionResolver } from "./n03BoundedPartitionResolver";
import {
  createSupabaseN03PartitionStorage,
  nationalRainN03PartitionChunkPath,
  nationalRainN03PartitionManifestPath,
} from "./n03PartitionStorage";
import type { HeavyRainPolygon } from "./nationalHeavyRain";

const rain: HeavyRainPolygon[] = [{
  type: "Polygon",
  coordinates: [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1], [0, 0]]],
}];
const geometry = {
  type: "Polygon" as const,
  coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
};

function makeFixture(code: string, municipalityCode: string, prefecture: string, municipality: string) {
  const packed = partitionAreas([{ code: municipalityCode, prefecture, municipality, geometry }]);
  const indexSha256 = sha256(JSON.stringify(packed.index));
  return {
    code,
    index: packed.index,
    indexSha256,
    objects: new Map<string, string>([
      [nationalRainN03PartitionManifestPath(code), JSON.stringify({ code, indexSha256, index: packed.index })],
      ...[...packed.files].map(([file, body]) => [
        nationalRainN03PartitionChunkPath(code, indexSha256, file), body,
      ] as [string, string]),
    ]),
  };
}

function storageClient(objects: Map<string, string>) {
  const download = vi.fn(async (path: string) => {
    const body = objects.get(path);
    return body === undefined
      ? { data: null, error: { message: "not found" } }
      : { data: new Blob([body]), error: null };
  });
  return { storage: { from: vi.fn(() => ({ download })) }, download };
}

test("offline Storage-to-resolver integration loads manifests/chunks and resolves municipalities", async () => {
  const fixtures = [
    makeFixture("01", "01202", "北海道", "函館市"),
    makeFixture("03", "03202", "岩手県", "宮古市"),
  ];
  const objects = new Map(fixtures.flatMap(f => [...f.objects]));
  const client = storageClient(objects);
  const storage = createSupabaseN03PartitionStorage(client as any);
  const datasets = await Promise.all(fixtures.map(f => storage.loadManifest(f.code)));
  const resolver = createN03BoundedPartitionResolver({
    datasets,
    read: (code, file, signal) => {
      const dataset = datasets.find(d => d.code === code)!;
      return storage.readChunk(code, dataset.indexSha256, file, signal);
    },
  });

  expect(await resolver.resolve(rain)).toEqual([
    { code: "01202", prefecture: "北海道", municipality: "函館市" },
    { code: "03202", prefecture: "岩手県", municipality: "宮古市" },
  ]);
  expect(client.download).toHaveBeenCalledTimes(4);
  expect(resolver.metrics.transfers).toBe(2);
  expect(resolver.metrics.decodes).toBe(2);
  expect(resolver.metrics.peakActiveDecodes).toBe(1);

  await resolver.resolve(rain);
  expect(client.download).toHaveBeenCalledTimes(4);
});

test("offline Storage-to-resolver integration fails closed on a corrupt selected chunk", async () => {
  const fixture = makeFixture("01", "01202", "北海道", "函館市");
  const objects = new Map(fixture.objects);
  const chunkPath = nationalRainN03PartitionChunkPath("01", fixture.indexSha256, fixture.index.chunks[0].file);
  objects.set(chunkPath, "[]");
  const storage = createSupabaseN03PartitionStorage(storageClient(objects) as any);
  const dataset = await storage.loadManifest("01");
  const resolver = createN03BoundedPartitionResolver({
    datasets: [dataset],
    read: (code, file, signal) => storage.readChunk(code, dataset.indexSha256, file, signal),
  });

  await expect(resolver.resolve(rain)).rejects.toThrow("Partition chunk integrity mismatch");
});
