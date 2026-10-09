// Local-only conversion of 47 existing prepared N03 JSON files.
// Usage: npx tsx scripts/n03-package-all-local.ts <input-dir> <empty-output-dir>
// Input files: <input-dir>/01.areas.json ... 47.areas.json
// This script never connects to Supabase or publishes manifests.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { JAPAN_PREFECTURES } from "../lib/weather/rain/japanPrefectures";
import type { AdministrativeArea } from "../lib/weather/rain/administrativeAreas";
import { packageN03Prefecture } from "./n03-partition-package";

export function packageAllLocal(inputDir: string, outputDir: string) {
  const input = resolve(inputDir);
  const output = resolve(outputDir);
  if (input === output || output.startsWith(input + sep) || input.startsWith(output + sep)) {
    throw new Error("Input and output directories must not overlap");
  }
  if (existsSync(output)) throw new Error("Output directory must not already exist");
  // Validate every input before creating any output file.
  const prepared = JAPAN_PREFECTURES.map(({ code, name }) => {
    const raw = JSON.parse(readFileSync(join(input, `${code}.areas.json`), "utf8")) as unknown;
    if (!Array.isArray(raw) || raw.length === 0 || raw.some(area =>
      !area || typeof area !== "object" || area.prefecture !== name ||
      !area.geometry || !["Polygon", "MultiPolygon"].includes(area.geometry.type))) {
      throw new Error(`Invalid prepared N03 input: ${code}`);
    }
    return { code, ...packageN03Prefecture(code, raw as AdministrativeArea[]) };
  });
  if (prepared.length !== 47) throw new Error("Expected 47 prefectures");
  mkdirSync(output, { recursive: false });
  let chunks = 0;
  for (const dataset of prepared) {
    for (const [path, body] of dataset.objects) {
      const full = join(output, path);
      mkdirSync(full.slice(0, full.lastIndexOf(sep)), { recursive: true });
      writeFileSync(full, body, { flag: "wx" });
      chunks++;
    }
    const manifest = join(output, dataset.manifestPath);
    mkdirSync(manifest.slice(0, manifest.lastIndexOf(sep)), { recursive: true });
    writeFileSync(manifest, dataset.manifestBody, { flag: "wx" });
  }
  return { prefectures: prepared.length, chunks, manifests: prepared.length, output };
}

if (process.argv[1]?.endsWith("n03-package-all-local.ts")) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("Usage: npx tsx scripts/n03-package-all-local.ts <input-dir> <empty-output-dir>");
  console.log(JSON.stringify(packageAllLocal(input, output)));
}
