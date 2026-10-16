import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  N03_DATASET_DATE,
  n03PrefectureArchiveUrl,
  n03PrefectureGeoJsonName,
} from "../lib/weather/rain/n03Dataset";
import {
  parseN03FeatureCollection,
  type N03FeatureCollection,
} from "../lib/weather/rain/n03AdministrativeAreas";
import { N03_PREFECTURE_INDEX_2026 } from "../lib/weather/rain/n03PrefectureIndex2026";

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

async function fetchWithRetry(url: string, attempts = 5) {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastStatus = response.status;
      if (!RETRYABLE_STATUS.has(response.status) || attempt === attempts) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (attempt === attempts) throw error;
    }
    const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
    console.warn(`N03 download retry ${attempt}/${attempts} after HTTP ${lastStatus || "network error"}; waiting ${delayMs}ms`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
  }
  throw new Error("N03 download retry exhausted");
}

async function main() {
  const outputRoot = resolve(process.argv[2] ?? `tmp/n03-prepared/${N03_DATASET_DATE}`);
  const requested = process.argv.slice(3);
  const selected = requested.length
    ? N03_PREFECTURE_INDEX_2026.filter(({ code }) => requested.includes(code))
    : N03_PREFECTURE_INDEX_2026;

  if (requested.length && selected.length !== new Set(requested).size) {
    throw new Error("Unknown or duplicate prefecture code");
  }

  mkdirSync(outputRoot, { recursive: true });
  const workRoot = mkdtempSync(join(tmpdir(), "n03-prepare-"));
  const manifest: { code: string; name: string; areas: number; bytes: number; sha256: string }[] = [];

  try {
    for (const prefecture of selected) {
      let response: Response;
      try {
        response = await fetchWithRetry(n03PrefectureArchiveUrl(prefecture.code));
      } catch (error) {
        throw new Error(`N03 download failed after retries: ${prefecture.code} ${error instanceof Error ? error.message : String(error)}`);
      }

      const zipPath = join(workRoot, `${prefecture.code}.zip`);
      const extractPath = join(workRoot, prefecture.code);
      mkdirSync(extractPath, { recursive: true });
      writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));
      execFileSync("unzip", ["-oq", zipPath, "-d", extractPath]);

      const collection = JSON.parse(
        readFileSync(join(extractPath, n03PrefectureGeoJsonName(prefecture.code)), "utf8"),
      ) as N03FeatureCollection;
      const areas = parseN03FeatureCollection(collection)
        .filter((area) => area.prefecture === prefecture.name);
      if (areas.length === 0) throw new Error(`No N03 areas prepared: ${prefecture.code}`);

      const body = JSON.stringify(areas);
      writeFileSync(join(outputRoot, `${prefecture.code}.areas.json`), body);
      manifest.push({
        code: prefecture.code,
        name: prefecture.name,
        areas: areas.length,
        bytes: Buffer.byteLength(body),
        sha256: createHash("sha256").update(body).digest("hex"),
      });
      console.log(`prepared ${prefecture.code} ${prefecture.name}: ${areas.length} areas`);
    }

    const totalBytes = manifest.reduce((sum, item) => sum + item.bytes, 0);
    writeFileSync(
      join(outputRoot, "manifest.json"),
      JSON.stringify({ dataset: `N03-${N03_DATASET_DATE}`, files: manifest, totalBytes }, null, 2),
    );
    console.log(JSON.stringify({ outputRoot, prefectures: manifest.length, totalBytes }));
  } finally {
    rmSync(workRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
