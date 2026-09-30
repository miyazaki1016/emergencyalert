import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import type { AdministrativeArea } from "../lib/weather/rain/administrativeAreas";
import { parseN03FeatureCollection } from "../lib/weather/rain/n03AdministrativeAreas";
import { municipalitiesForNationalRainFootprint } from "../lib/weather/rain/nationalRainMunicipalities";
import { partitionAreas, resolvePartitionedFootprint, sha256 } from "./n03-partition-design-core";
import { createBoundedPartitionResolver } from "./n03-bounded-partition-loader";
import { datasets, representativeQueries } from "./n03-readiness-common";

async function main() {
  const [mode, root, code, source] = process.argv.slice(2);
  if (!root || !code) throw new Error("mode root code [source GeoJSON]");
  const out = join(root, code); mkdirSync(out, { recursive: true });
  if (mode === "prepare") {
    const areas: AdministrativeArea[] = source ? parseN03FeatureCollection(JSON.parse(readFileSync(source, "utf8"))).filter(a => a.code.startsWith(code)) : JSON.parse(readFileSync(join(root, `${code}.areas.json`), "utf8"));
    if (!areas.length) throw new Error("No representative areas");
    const body = JSON.stringify(areas); writeFileSync(join(root, `${code}.areas.json`), body);
    const { index, files } = partitionAreas(areas);
    const originals = areas.map(a => a.geometry.type === "Polygon" ? [a.geometry.coordinates] : a.geometry.coordinates);
    let verified = 0;
    for (const [file, content] of files) {
      for (const part of JSON.parse(content)) {
        if (JSON.stringify(part.geometry.coordinates) !== JSON.stringify(originals[part.areaOrder][part.polygonOrder])) throw new Error("Exact coordinate reconstruction mismatch");
        verified++;
      }
      writeFileSync(join(out, file), content);
    }
    if (verified !== index.parts.length) throw new Error("Incomplete partition reconstruction");
    const indexBody = JSON.stringify(index); writeFileSync(join(out, "index.json"), indexBody);
    const summary = { mode: "REPRESENTATIVE_PARTITION_PREPARATION", code, preparedBytes: Buffer.byteLength(body), preparedSha256: sha256(body), areas: areas.length, parts: verified, chunks: files.size, indexBytes: Buffer.byteLength(indexBody), indexSha256: sha256(indexBody), maxChunkBytes: Math.max(...index.chunks.map(c => c.bytes)), exactCoordinates: true };
    writeFileSync(join(out, "preparation.json"), JSON.stringify(summary)); console.log(JSON.stringify(summary)); return;
  }
  if (mode === "compare") {
    const full = JSON.parse(readFileSync(join(out, "whole.json"), "utf8"));
    for (const variant of ["partition", "uncached"]) {
      const partition = JSON.parse(readFileSync(join(out, `${variant}.json`), "utf8"));
      if (JSON.stringify(full.results) !== JSON.stringify(partition.results)) throw new Error("Ordered municipality equivalence failed");
    }
    console.log(JSON.stringify({ mode: "REPRESENTATIVE_PARTITION_EQUIVALENCE", code, queries: full.results.length, equal: true })); return;
  }
  if (!["whole", "partition", "uncached"].includes(mode)) throw new Error("Unknown proof mode");
  const started = performance.now();
  const areas: AdministrativeArea[] = mode === "whole" ? JSON.parse(readFileSync(join(root, `${code}.areas.json`), "utf8")) : [];
  const resolver = mode === "partition" ? createBoundedPartitionResolver({ datasets: datasets(root, [code]), read: (code, file) => readFile(join(root, code, file)) }) : undefined;
  const uncached = mode === "uncached" ? datasets(root, [code])[0].index : undefined;
  let uncachedBytes = 0; const rows = [];
  for (const query of representativeQueries(code)) {
    const result = uncached ? await resolvePartitionedFootprint(query.rain, uncached, file => readFile(join(root, code, file))) : undefined;
    uncachedBytes += result?.loadedBytes ?? 0;
    rows.push({ key: query.key, municipalities: result?.municipalities ?? (resolver ? await resolver.resolve(query.rain) : municipalitiesForNationalRainFootprint(query.rain, areas)) });
  }
  const elapsedMs = performance.now() - started;
  const report = { mode: "REPRESENTATIVE_N03_READINESS", code, variant: mode, elapsedMs, processMaxRssMiB: process.resourceUsage().maxRSS / 1024, readBytes: resolver?.metrics.transferBytes ?? (uncached ? uncachedBytes : Buffer.byteLength(readFileSync(join(root, `${code}.areas.json`)))), cache: resolver?.cache.stats, results: rows, limitations: ["Local filesystem N03-only; no HTTP/JMA/DB", "Cache weight is an accounting limit, not an RSS guarantee"] };
  writeFileSync(join(out, `${mode}.json`), JSON.stringify(report)); console.log(JSON.stringify({ ...report, results: undefined, queries: rows.length, stressHits: rows[0].municipalities.length }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
