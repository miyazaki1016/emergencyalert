import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const OBJECT_PATH = "20260101/lrpm-20260101-v1.tar.gz";
const EXPECTED_SHA256 = "5fb0823f190e9ed893ba5ee9ae47aa7b1e4a8ad9c26601e2cae8b14bc1de33d8";

async function main() {
  const [archivePath] = process.argv.slice(2);
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!archivePath || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node --import tsx scripts/upload-national-lrpm.ts <verified-tar.gz>");
  }

  const bytes = await readFile(archivePath);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== EXPECTED_SHA256) throw new Error("LRPM_SHA256_MISMATCH");

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const storage = client.storage.from("national-rain-n03");
  const { data: existing, error: listingError } = await storage.list("20260101", {
    search: "lrpm-20260101-v1.tar.gz",
    limit: 100,
  });
  if (listingError) throw new Error("LRPM_STORAGE_LIST_FAILED");
  if (existing?.some(object => object.name === "lrpm-20260101-v1.tar.gz")) {
    throw new Error("LRPM_ALREADY_EXISTS: do not overwrite without explicit review");
  }

  const { error } = await storage.upload(OBJECT_PATH, bytes, {
    contentType: "application/gzip",
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw new Error("LRPM_UPLOAD_FAILED: " + error.message);

  const { data: listed, error: verifyError } = await storage.list("20260101", {
    search: "lrpm-20260101-v1.tar.gz",
    limit: 100,
  });
  if (verifyError || !listed?.some(object => object.name === "lrpm-20260101-v1.tar.gz")) {
    throw new Error("LRPM_POST_UPLOAD_LIST_FAILED");
  }
  console.log("LRPM_UPLOAD_VERIFIED: " + OBJECT_PATH + " SHA256=" + actual);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "LRPM_UPLOAD_FAILED");
  process.exitCode = 1;
});
