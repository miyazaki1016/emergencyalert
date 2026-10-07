import type { SupabaseClient } from "@supabase/supabase-js";
import { N03_DATASET_DATE } from "./n03Dataset";
import type { N03PartitionDataset, PartitionIndex } from "./n03BoundedPartitionResolver";

export const NATIONAL_RAIN_N03_PARTITION_BUCKET = "national-rain-n03";
export const NATIONAL_RAIN_N03_PARTITION_FORMAT = "polygon-parts-v1";
export const NATIONAL_RAIN_N03_PARTITION_PREFIX =
  `${N03_DATASET_DATE}/${NATIONAL_RAIN_N03_PARTITION_FORMAT}`;

function assertPrefectureCode(code: string) {
  if (!/^\d{2}$/.test(code)) throw new Error("Invalid N03 prefecture code");
}
function assertChunkFile(file: string) {
  if (!/^chunk-\d{4}\.json$/.test(file)) throw new Error("Invalid N03 partition chunk file");
}

export function nationalRainN03PartitionManifestPath(code: string) {
  assertPrefectureCode(code);
  return `${NATIONAL_RAIN_N03_PARTITION_PREFIX}/${code}/manifest.json`;
}

export function nationalRainN03PartitionChunkPath(code: string, indexSha256: string, file: string) {
  assertPrefectureCode(code);
  if (!/^[a-f0-9]{64}$/.test(indexSha256)) throw new Error("Invalid N03 partition manifest hash");
  assertChunkFile(file);
  return `${NATIONAL_RAIN_N03_PARTITION_PREFIX}/${code}/${indexSha256}/${file}`;
}

type ManifestEnvelope = {
  code: string;
  indexSha256: string;
  index: PartitionIndex;
};

async function downloadBytes(
  supabase: Pick<SupabaseClient, "storage">,
  path: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const { data, error } = await supabase.storage
    .from(NATIONAL_RAIN_N03_PARTITION_BUCKET)
    .download(path, {}, { signal });
  if (error || !data) throw new Error(`N03 partition Storage download failed: ${path} ${error?.message ?? "missing data"}`);
  signal?.throwIfAborted();
  return Buffer.from(await data.arrayBuffer());
}

export function createSupabaseN03PartitionStorage(
  supabase: Pick<SupabaseClient, "storage">,
) {
  const manifests = new Map<string, Promise<N03PartitionDataset>>();

  async function loadManifest(code: string, signal?: AbortSignal): Promise<N03PartitionDataset> {
    assertPrefectureCode(code);
    let pending = manifests.get(code);
    if (!pending) {
      pending = (async () => {
        const path = nationalRainN03PartitionManifestPath(code);
        const body = await downloadBytes(supabase, path, signal);
        let value: ManifestEnvelope;
        try {
          value = JSON.parse(body.toString("utf8")) as ManifestEnvelope;
        } catch {
          throw new Error(`N03 partition manifest is not valid JSON: ${code}`);
        }
        if (!value || value.code !== code || !/^[a-f0-9]{64}$/.test(value.indexSha256) || !value.index) {
          throw new Error(`N03 partition manifest identity mismatch: ${code}`);
        }
        return { code, index: value.index, indexSha256: value.indexSha256 };
      })();
      manifests.set(code, pending);
      void pending.catch(() => { if (manifests.get(code) === pending) manifests.delete(code); });
    }
    return pending;
  }

  async function readChunk(code: string, indexSha256: string, file: string, signal?: AbortSignal) {
    return downloadBytes(supabase, nationalRainN03PartitionChunkPath(code, indexSha256, file), signal);
  }

  return { loadManifest, readChunk };
}
