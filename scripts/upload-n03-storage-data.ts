import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { N03_DATASET_DATE } from "../lib/weather/rain/n03Dataset";
import { NATIONAL_RAIN_N03_BUCKET, NATIONAL_RAIN_N03_PREFIX } from "../lib/weather/rain/n03PreparedStorageLoader";

async function main() {
  if (process.env.N03_STORAGE_UPLOAD_CONFIRM !== "UPLOAD_N03_PREPARED_DATA") {
    throw new Error("Refusing upload: set N03_STORAGE_UPLOAD_CONFIRM=UPLOAD_N03_PREPARED_DATA");
  }
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

  const root = resolve(process.argv[2] ?? `tmp/n03-prepared/${N03_DATASET_DATE}`);
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as {
    dataset: string;
    files: { code: string; name: string; bytes: number; sha256: string }[];
  };
  if (manifest.dataset !== `N03-${N03_DATASET_DATE}`) throw new Error("Unexpected N03 dataset");
  if (manifest.files.length !== 47) throw new Error(`Refusing partial upload: expected 47 prefectures, got ${manifest.files.length}`);

  const expected = new Set(manifest.files.map(({ code }) => `${code}.areas.json`));
  const actual = readdirSync(root).filter((name) => name.endsWith(".areas.json"));
  if (actual.length !== 47 || actual.some((name) => !expected.has(name))) {
    throw new Error("Prepared N03 files do not match manifest");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const file of manifest.files) {
    const filename = `${file.code}.areas.json`;
    const body = readFileSync(join(root, filename));
    if (body.byteLength !== file.bytes) throw new Error(`Size mismatch: ${filename}`);
    const sha256 = createHash("sha256").update(body).digest("hex");
    if (sha256 !== file.sha256) throw new Error(`SHA-256 mismatch: ${filename}`);

    const path = `${NATIONAL_RAIN_N03_PREFIX}/${filename}`;
    const { error } = await supabase.storage
      .from(NATIONAL_RAIN_N03_BUCKET)
      .upload(path, body, { contentType: "application/json", upsert: false });
    if (error) {
      const { data: existing, error: downloadError } = await supabase.storage
        .from(NATIONAL_RAIN_N03_BUCKET)
        .download(path);
      if (downloadError || !existing) throw new Error(`Upload failed: ${path}: ${error.message}`);
      const existingBody = Buffer.from(await existing.arrayBuffer());
      const existingSha256 = createHash("sha256").update(existingBody).digest("hex");
      if (existingBody.byteLength !== file.bytes || existingSha256 !== file.sha256) {
        throw new Error(`Existing Storage object mismatch: ${path}`);
      }
      console.log(`already verified ${path} (${existingBody.byteLength} bytes)`);
      continue;
    }
    console.log(`uploaded ${path} (${body.byteLength} bytes)`);
  }

  console.log(`uploaded 47 prefectures to ${NATIONAL_RAIN_N03_BUCKET}/${NATIONAL_RAIN_N03_PREFIX}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
