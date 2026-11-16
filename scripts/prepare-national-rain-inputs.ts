import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { ALL_PREFECTURE_CODES } from "../lib/weather/rain/lightRainNationwideN03";

async function main() {
  const [n03Dir, maskCache] = process.argv.slice(2);
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!n03Dir || !maskCache || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("National rain input configuration is incomplete");
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const storage = db.storage.from("national-rain-n03");
  await mkdir(n03Dir, { recursive: true });
  const signal = AbortSignal.timeout(90_000);
  for (let i = 0; i < ALL_PREFECTURE_CODES.length; i += 8) {
    await Promise.all(ALL_PREFECTURE_CODES.slice(i, i + 8).map(async code => {
      const filename = code + ".areas.json";
      const { data, error } = await storage.download("20260101/" + filename, {}, { signal });
      if (error || !data) throw new Error("N03_DOWNLOAD_FAILED: " + code);
      await writeFile(join(n03Dir, filename), Buffer.from(await data.arrayBuffer()));
    }));
  }

  const { data, error } = await storage.createSignedUrl("20260101/lrpm-20260101-v1.tar.gz", 180);
  if (error || !data) throw new Error("LRPM_SIGNED_URL_FAILED");
  const result = spawnSync(process.execPath, [
    "--import", "tsx", "scripts/light-rain-mask-prepare.ts", maskCache,
  ], {
    env: {
      ...process.env,
      SUPABASE_SERVICE_ROLE_KEY: "",
      LRPM_ARCHIVE_URL: data.signedUrl,
      LRPM_ARCHIVE_SHA256: "5fb0823f190e9ed893ba5ee9ae47aa7b1e4a8ad9c26601e2cae8b14bc1de33d8",
    },
    stdio: ["ignore", "ignore", "ignore"],
    timeout: 130_000,
  });
  if (result.status !== 0) throw new Error("LRPM_PREPARATION_FAILED");
  console.log("Validated the versioned LRPM archive and downloaded 47 prefectures");
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "FORECAST_INPUTS_FAILED");
  process.exitCode = 1;
});
