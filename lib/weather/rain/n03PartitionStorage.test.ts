import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  NATIONAL_RAIN_N03_PARTITION_BUCKET,
  NATIONAL_RAIN_N03_PARTITION_PREFIX,
  createSupabaseN03PartitionStorage,
  nationalRainN03PartitionChunkPath,
  nationalRainN03PartitionManifestPath,
} from "./n03PartitionStorage";

const hash = "a".repeat(64);
const indexHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const index = {
  format: "N03_POLYGON_PART_DESIGN_V1" as const,
  datasetDate: "20260101",
  targetBytes: 1048576,
  areas: [{ code: "13111", prefecture: "東京都", municipality: "大田区", order: 0 }],
  parts: [{ id: 0, areaOrder: 0, polygonOrder: 0, bbox: [139, 35, 140, 36] as [number, number, number, number], chunk: "chunk-0000.json" }],
  chunks: [{ file: "chunk-0000.json", bytes: 2, sha256: "b".repeat(64), partCount: 1, oversized: false }],
};
function client(files: Record<string, string>) {
  const download = vi.fn(async (path: string, _options?: unknown, _fetchOptions?: unknown) => {
    const body = files[path];
    return body === undefined
      ? { data: null, error: { message: "not found" } }
      : { data: new Blob([body]), error: null };
  });
  const from = vi.fn(() => ({ download }));
  return { storage: { from }, from, download };
}

describe("N03 partition Storage contract", () => {
  it("uses a versioned namespace separate from whole-prefecture prepared objects", () => {
    expect(NATIONAL_RAIN_N03_PARTITION_BUCKET).toBe("national-rain-n03");
    expect(NATIONAL_RAIN_N03_PARTITION_PREFIX).toBe("20260101/polygon-parts-v1");
    expect(nationalRainN03PartitionManifestPath("13")).toBe("20260101/polygon-parts-v1/13/manifest.json");
    expect(nationalRainN03PartitionChunkPath("13", hash, "chunk-0000.json"))
      .toBe(`20260101/polygon-parts-v1/13/${hash}/chunk-0000.json`);
  });

  it("loads and single-flights an immutable manifest", async () => {
    const path = nationalRainN03PartitionManifestPath("13");
    const digest = indexHash(index);
    const storage = client({ [path]: JSON.stringify({ code: "13", indexSha256: digest, index }) });
    const reader = createSupabaseN03PartitionStorage(storage as any);
    const [a, b] = await Promise.all([reader.loadManifest("13"), reader.loadManifest("13")]);
    expect(a).toEqual(b);
    expect(storage.download).toHaveBeenCalledTimes(1);
    expect(storage.from).toHaveBeenCalledWith(NATIONAL_RAIN_N03_PARTITION_BUCKET);
  });

  it("fails closed for a missing or wrong manifest instead of falling back", async () => {
    const missing = createSupabaseN03PartitionStorage(client({}) as any);
    await expect(missing.loadManifest("13")).rejects.toThrow("N03 partition Storage download failed");

    const path = nationalRainN03PartitionManifestPath("13");
    const wrong = createSupabaseN03PartitionStorage(client({
      [path]: JSON.stringify({ code: "14", indexSha256: hash, index }),
    }) as any);
    await expect(wrong.loadManifest("13")).rejects.toThrow("manifest identity mismatch");

    const badHash = createSupabaseN03PartitionStorage(client({
      [path]: JSON.stringify({ code: "13", indexSha256: hash, index }),
    }) as any);
    await expect(badHash.loadManifest("13")).rejects.toThrow("manifest index hash mismatch");
  });

  it("passes abort signal to manifest and chunk downloads", async () => {
    const manifestPath = nationalRainN03PartitionManifestPath("13");
    const chunkPath = nationalRainN03PartitionChunkPath("13", hash, "chunk-0000.json");
    const storage = client({
      [manifestPath]: JSON.stringify({ code: "13", indexSha256: indexHash(index), index }),
      [chunkPath]: "[]",
    });
    const reader = createSupabaseN03PartitionStorage(storage as any);
    const signal = new AbortController().signal;
    await reader.loadManifest("13", signal);
    await reader.readChunk("13", hash, "chunk-0000.json", signal);
    expect(storage.download).toHaveBeenNthCalledWith(1, manifestPath, {}, { signal });
    expect(storage.download).toHaveBeenNthCalledWith(2, chunkPath, {}, { signal });
  });

  it("rejects malformed path identities", () => {
    expect(() => nationalRainN03PartitionManifestPath("1")).toThrow();
    expect(() => nationalRainN03PartitionChunkPath("13", "bad", "chunk-0000.json")).toThrow();
    expect(() => nationalRainN03PartitionChunkPath("13", hash, "../x")).toThrow();
  });
});
