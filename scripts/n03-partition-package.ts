// Offline-only packaging. Never uploads or modifies Supabase Storage.
import { createHash } from "node:crypto";
import type { AdministrativeArea } from "../lib/weather/rain/administrativeAreas";
import { N03_DATASET_DATE } from "../lib/weather/rain/n03Dataset";
import { nationalRainN03PartitionChunkPath, nationalRainN03PartitionManifestPath } from "../lib/weather/rain/n03PartitionStorage";
import { createN03BoundedPartitionResolver } from "../lib/weather/rain/n03BoundedPartitionResolver";
import { partitionAreas } from "./n03-partition-design-core";

const digest = (data: string) => createHash("sha256").update(data).digest("hex");

/** Builds upload-ready, versioned objects entirely in memory; caller owns persistence. */
export function packageN03Prefecture(code: string, areas: AdministrativeArea[], targetBytes = 1024 * 1024) {
  if (!/^\\d{2}$/.test(code) || !areas.length) throw new Error("Invalid or empty prefecture");
  if (areas.some(area => !/^\\d{5}$/.test(area.code) || !area.code.startsWith(code))) {
    throw new Error("N03 area belongs to another prefecture");
  }
  const { index, files } = partitionAreas(areas, targetBytes);
  if (index.datasetDate !== N03_DATASET_DATE) throw new Error("Unexpected dataset date");
  if (index.chunks.some(chunk => chunk.oversized || chunk.bytes > 32 * 1048576)) {
    throw new Error("Oversized N03 partition: refusing to package");
  }
  const indexSha256 = digest(JSON.stringify(index));
  // Validate manifest structure before emitting any object.
  const resolver = createN03BoundedPartitionResolver({
    datasets: [{ code, index, indexSha256 }],
    read: async (_code, file) => Buffer.from(files.get(file) ?? ""),
  });
  if (!resolver) throw new Error("Invalid partition resolver");
  const objects = new Map<string, string>();
  for (const [file, body] of files) {
    objects.set(nationalRainN03PartitionChunkPath(code, indexSha256, file), body);
  }
  // Publish manifests only after chunks have been uploaded and verified.
  const manifestPath = nationalRainN03PartitionManifestPath(code);
  const manifestBody = JSON.stringify({ code, indexSha256, index });
  return { code, indexSha256, manifestPath, manifestBody, objects, chunkCount: files.size };
}
