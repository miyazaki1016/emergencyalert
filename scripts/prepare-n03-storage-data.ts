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
      const response = await fetch(n03PrefectureArchiveUrl(prefecture.code));
      if (!response.ok) throw new Error(`N03 download failed: ${prefecture.code} ${response.status}`);

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
