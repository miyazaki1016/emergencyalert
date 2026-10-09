import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { N03_DATASET_DATE } from "../lib/weather/rain/n03Dataset";
import {
  NATIONAL_RAIN_N03_BUCKET,
  nationalRainN03ObjectPath,
} from "../lib/weather/rain/n03PreparedStorageLoader";

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

  const manifestPath = resolve(process.argv[2] ?? `tmp/n03-prepared/${N03_DATASET_DATE}/manifest.json`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    dataset: string;
    files: { code: string; bytes: number; sha256: string }[];
  };
  if (manifest.dataset !== `N03-${N03_DATASET_DATE}`) throw new Error("Unexpected N03 dataset");
  if (manifest.files.length !== 47) throw new Error(`Expected 47 prefectures, got ${manifest.files.length}`);

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const file of manifest.files) {
    const path = nationalRainN03ObjectPath(file.code);
    const { data, error } = await supabase.storage.from(NATIONAL_RAIN_N03_BUCKET).download(path);
    if (error || !data) throw new Error(`Missing Storage object: ${path}: ${error?.message ?? "missing data"}`);
    const body = Buffer.from(await data.arrayBuffer());
    if (body.byteLength !== file.bytes) throw new Error(`Storage size mismatch: ${path}`);
    const sha256 = createHash("sha256").update(body).digest("hex");
    if (sha256 !== file.sha256) throw new Error(`Storage SHA-256 mismatch: ${path}`);
    console.log(`verified ${path} (${body.byteLength} bytes)`);
  }

  console.log(`verified 47 immutable N03 objects for N03-${N03_DATASET_DATE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
