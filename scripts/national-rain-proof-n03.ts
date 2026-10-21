import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseN03AdministrativeAreaLoader, NATIONAL_RAIN_N03_BUCKET, NATIONAL_RAIN_N03_PREFIX } from "../lib/weather/rain/n03PreparedStorageLoader";

export function prepareProofN03(root: string, codes: string[]) {
  const missing = [...new Set(codes)].filter(code => !existsSync(join(root, `${code}.areas.json`)));
  if (missing.length) execFileSync("npx", ["--yes", "tsx", "scripts/prepare-n03-storage-data.ts", root, ...missing], { stdio: ["ignore", "inherit", "inherit"] });
}

export function localPreparedLoader(root: string) {
  const downloads: Record<string, number> = {};
  const storage = { from: (bucket: string) => {
    if (bucket !== NATIONAL_RAIN_N03_BUCKET) throw new Error("Unexpected bucket");
    return { download: async (path: string) => {
      const match = new RegExp(`^${NATIONAL_RAIN_N03_PREFIX}/(\\d{2})\\.areas\\.json$`).exec(path);
      if (!match) throw new Error("Unexpected object path");
      const code = match[1]; downloads[code] = (downloads[code] ?? 0) + 1;
      return { data: new Blob([await readFile(join(root, `${code}.areas.json`))]), error: null };
    } };
  } };
  return { load: createSupabaseN03AdministrativeAreaLoader({ storage } as unknown as Pick<SupabaseClient, "storage">), downloads };
}
