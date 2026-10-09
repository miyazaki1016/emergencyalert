// Local-only conversion of 47 existing prepared N03 JSON files.
// Usage: npx tsx scripts/n03-package-all-local.ts <input-dir> <empty-output-dir>
// Input files: <input-dir>/01.areas.json ... 47.areas.json
// This script never connects to Supabase or publishes manifests.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
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
  // Preflight all 47 inputs and pin each input digest without retaining geometry.
  const inputHashes = new Map<string, string>();
  for (const { code, name } of JAPAN_PREFECTURES) {
    const file = join(input, `${code}.areas.json`);
    if (!existsSync(file)) throw new Error(`Missing prepared N03 input: ${code}`);
    const source = readFileSync(file);
    inputHashes.set(code, createHash("sha256").update(source).digest("hex"));
    const raw = JSON.parse(source.toString("utf8")) as unknown;
    if (!Array.isArray(raw) || raw.length === 0 || raw.some(area =>
      !area || typeof area !== "object" || area.prefecture !== name ||
      typeof area.code !== "string" || !/^\d{5}$/.test(area.code) || !area.code.startsWith(code) ||
      !area.geometry || !["Polygon", "MultiPolygon"].includes(area.geometry.type))) {
      throw new Error(`Invalid prepared N03 input: ${code}`);
    }
  }
  if (JAPAN_PREFECTURES.length !== 47) throw new Error("Expected 47 prefectures");
  mkdirSync(output, { recursive: false });
  let chunks = 0;
  let verifiedBytes = 0;
  for (const { code, name } of JAPAN_PREFECTURES) {
    const source = readFileSync(join(input, `${code}.areas.json`));
    if (createHash("sha256").update(source).digest("hex") !== inputHashes.get(code)) {
      throw new Error(`Prepared N03 input changed after preflight: ${code}`);
    }
    const raw = JSON.parse(source.toString("utf8")) as unknown;
    if (!Array.isArray(raw) || raw.length === 0 || raw.some(area =>
      !area || typeof area !== "object" || area.prefecture !== name ||
      !area.geometry || !["Polygon", "MultiPolygon"].includes(area.geometry.type))) {
      throw new Error(`Invalid prepared N03 input: ${code}`);
    }
    const dataset = packageN03Prefecture(code, raw as AdministrativeArea[]);
    for (const [path, body] of dataset.objects) {
      const full = join(output, path);
      mkdirSync(full.slice(0, full.lastIndexOf(sep)), { recursive: true });
      writeFileSync(full, body, { flag: "wx" });
      const actual = readFileSync(full);
      const expectedHash = createHash("sha256").update(body).digest("hex");
      const actualHash = createHash("sha256").update(actual).digest("hex");
      if (actualHash !== expectedHash) throw new Error(`Chunk readback mismatch: ${path}`);
      verifiedBytes += actual.byteLength;
      chunks++;
    }
    const manifest = join(output, dataset.manifestPath);
    mkdirSync(manifest.slice(0, manifest.lastIndexOf(sep)), { recursive: true });
    // Manifest is written last, after all chunks for this prefecture pass readback.
    writeFileSync(manifest, dataset.manifestBody, { flag: "wx" });
  }
  return { prefectures: JAPAN_PREFECTURES.length, chunks, manifests: JAPAN_PREFECTURES.length, verifiedBytes, output };
}

if (process.argv[1]?.endsWith("n03-package-all-local.ts")) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("Usage: npx tsx scripts/n03-package-all-local.ts <input-dir> <empty-output-dir>");
  console.log(JSON.stringify(packageAllLocal(input, output)));
}
