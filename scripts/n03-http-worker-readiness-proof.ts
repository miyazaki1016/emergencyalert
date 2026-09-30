import { processDeadlineProofJobs } from "./national-deadline-worker";
import { fork, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import type { AdministrativeArea } from "../lib/weather/rain/administrativeAreas";
import { municipalitiesForNationalRainFootprint } from "../lib/weather/rain/nationalRainMunicipalities";
import { prefecturesForRainPolygons } from "../lib/weather/rain/n03Prefectures";
import { N03_PREFECTURE_INDEX_2026 } from "../lib/weather/rain/n03PrefectureIndex2026";
import { createBoundedPartitionResolver } from "./n03-bounded-partition-loader";
import { datasets, STRESS_TILES } from "./n03-readiness-common";
import { measureWorker } from "./national-rain-throughput-harness";
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const profiles: Record<string, { latencyMs: number; bytesPerSecond: number }> = {
  nominal: { latencyMs: 80, bytesPerSecond: 8 * 1048576 },
  constrained: { latencyMs: 250, bytesPerSecond: 2 * 1048576 },
};

async function serve(root: string, profileName: string) {
  const profile = profiles[profileName]; if (!profile) throw new Error("Invalid HTTP profile");
  let nextByteSlot = 0;
  const server = createServer(async (req, res) => {
    if (req.method !== "GET" || req.headers.authorization !== "Bearer local-read-only-proof") { res.writeHead(403).end(); return; }
    const match = /^\/(\d{2})\/(chunk-\d{4}\.json|whole\.json)$/.exec(req.url ?? "");
    if (!match) { res.writeHead(404).end(); return; }
    const path = match[2] === "whole.json" ? join(root, `${match[1]}.areas.json`) : join(root, match[1], match[2]);
    try {
      const size = statSync(path).size;
      await wait(profile.latencyMs);
      res.writeHead(200, { "Content-Length": size, "Content-Type": "application/json", "Cache-Control": "private, no-store" });
      for await (const value of createReadStream(path, { highWaterMark: 65536 })) {
        if (res.destroyed) break;
        const part = value as Buffer;
        // Shared bandwidth across all requests, not bandwidth per socket.
        const start = Math.max(performance.now(), nextByteSlot);
        nextByteSlot = start + part.length / profile.bytesPerSecond * 1000;
        await wait(Math.max(0, nextByteSlot - performance.now()));
        if (res.destroyed) break;
        if (!res.write(part)) await new Promise<void>(r => {
          const done = () => { res.off("drain", done); res.off("close", done); r(); };
          res.once("drain", done); res.once("close", done);
        });
      }
      res.end();
    } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
  });
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  process.send?.({ port: (server.address() as { port: number }).port });
}

export async function startProofHttp(root: string, profile: string): Promise<{ baseUrl: string; stop: () => void }> {
  const child: ChildProcess = fork(fileURLToPath(new URL("./n03-http-worker-readiness-proof.ts", import.meta.url)), ["serve", root, profile], { stdio: ["ignore", "ignore", "inherit", "ipc"] });
  const port = await new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Proof HTTP startup timeout")); }, 10000);
    child.once("message", message => { clearTimeout(timeout); resolve((message as { port: number }).port); });
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Proof HTTP exited ${code}`)); });
  });
  return { baseUrl: `http://127.0.0.1:${port}`, stop: () => { child.kill(); } };
}

export function densePng() {
  const png = new PNG({ width: 256, height: 256 });
  for (let i = 0; i < png.data.length; i += 4) { png.data[i] = 255; png.data[i + 1] = 40; png.data[i + 2] = 0; png.data[i + 3] = 255; }
  return PNG.sync.write(png);
}

async function main() {
  const [mode, root, codeList, variant = "cached", profileName = "nominal", concurrencyText = "4", offeredText = "32"] = process.argv.slice(2);
  if (mode === "serve") { await serve(root, codeList); return; }
  if (mode !== "worker" || !["cached", "whole"].includes(variant) || !profiles[profileName]) throw new Error("worker root codes cached/whole nominal/constrained concurrency offered");
  const codes = codeList.split(","); const concurrency = Number(concurrencyText), offered = Number(offeredText);
  if (![1,2,4].includes(concurrency) || !Number.isInteger(offered) || offered < 1 || offered > 100) throw new Error("Invalid worker proof options");
  const sharedUrl = process.env.N03_PROOF_HTTP_URL;
  if (sharedUrl && !/^http:\/\/127\.0\.0\.1:\d+$/.test(sharedUrl)) throw new Error("Only localhost proof HTTP is allowed");
  const http = sharedUrl ? { baseUrl: sharedUrl, stop: () => {} } : await startProofHttp(root, profileName);
  try {
    let requests = 0, transferBytes = 0; const readDurations: number[] = [];
    let phaseSignal: AbortSignal | undefined;
    const read = async (code: string, file: string) => {
      const started = performance.now();
      requests++;
      try {
        const response = await fetch(`${http.baseUrl}/${code}/${file}`, { headers: { Authorization: "Bearer local-read-only-proof" }, signal: phaseSignal ? AbortSignal.any([phaseSignal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
        if (!response.ok || !response.body) throw new Error(`Proof Storage HTTP ${response.status}`);
        const parts: Buffer[] = [];
        for await (const part of response.body as unknown as AsyncIterable<Uint8Array>) { transferBytes += part.byteLength; parts.push(Buffer.from(part)); }
        return Buffer.concat(parts);
      } finally { readDurations.push(performance.now() - started); }
    };
    const ownership = process.env.N03_PROOF_OWNER !== undefined ? JSON.parse(readFileSync("docs/proofs/national-all47-ownership.json", "utf8")).ownership : undefined;
    const owner = Number(process.env.N03_PROOF_OWNER);
    if (ownership && (!Number.isInteger(owner) || owner < 0 || owner >= ownership.regionCount)) throw new Error("Invalid proof owner");
    const preparedDatasets = datasets(root,codes);
    if (ownership) for (const d of preparedDatasets) for (const c of d.index.chunks) {
      const assigned = ownership.owners[`${d.code}/${c.file}`];
      if (!Number.isInteger(assigned) || assigned < 0 || assigned >= ownership.regionCount) throw new Error("Missing/invalid immutable chunk owner");
    }
    const owns = ownership ? (code: string,file: string) => ownership.owners[`${code}/${file}`] === owner : undefined;
    const resolver = variant === "cached" ? createBoundedPartitionResolver({ datasets: preparedDatasets, read, owns, get signal() { return phaseSignal; } }) : undefined;
    const wholeFlights = new Map<string, Promise<AdministrativeArea[]>>();
    const wholeLoad = (code: string) => {
      let loaded = wholeFlights.get(code);
      if (!loaded) { loaded = read(code, "whole.json").then(body => JSON.parse(body.toString("utf8"))); wholeFlights.set(code, loaded); }
      return loaded;
    };
    const resolve = resolver?.resolve ?? (async rain => {
      const selected = prefecturesForRainPolygons(rain, N03_PREFECTURE_INDEX_2026).filter(p => codes.includes(p.code));
      const areas = (await Promise.all(selected.map(p => wholeLoad(p.code)))).flat();
      return municipalitiesForNationalRainFootprint(rain, areas);
    });
    const body = densePng();
    const jobs = Array.from({ length: offered }, (_, i) => ({ id: i + 1, run_key: `http-${i}`, basetime: "20260930060000", validtime: "20260930060500", zoom: 8, tile_x: STRESS_TILES[codes[i % codes.length]].x, tile_y: STRESS_TILES[codes[i % codes.length]].y }));
    for (const phase of (process.env.N03_PROOF_COLD_ONLY ? ["cold"] : ["cold", "warm"])) {
      phaseSignal = process.env.N03_PROOF_HARD_DEADLINE ? AbortSignal.timeout(42000) : undefined;
      const before = { requests, transferBytes, readCount: readDurations.length, cache: resolver ? {...resolver.cache.stats} : undefined }; const measured = await measureWorker({ jobs, concurrency, fetcher: async () => new Response(new Uint8Array(body)), resolveMunicipalities: phaseSignal ? async rain => { phaseSignal!.throwIfAborted(); const r = await resolve(rain); phaseSignal!.throwIfAborted(); return r; } : resolve, processor: phaseSignal ? (client,opts) => processDeadlineProofJobs(client,{...opts,signal:phaseSignal}) : undefined });
      if (!measured.municipalityHits) throw new Error("HTTP proof must intersect real municipalities");
      console.log(JSON.stringify({ mode: "HTTP_READINESS_ACTUAL_WORKER", codes, variant, phase, profile: { ...profiles[profileName], name: profileName, source: "ASSUMED sensitivity inputs; measured localhost transfers" }, offered, chunkOwner: ownership ? owner : undefined, ownedChunkPartialResults: !!ownership, hardDeadlineProof: !!phaseSignal, deadlineReached: Number(phaseSignal?.aborted ?? false), deadlineReachedJobs: measured.result.deferred, admissionStopped: !!phaseSignal && measured.result.claimed < offered, unclaimed: offered-measured.result.claimed, defer: measured.result.deferred, requests: requests - before.requests, transferBytes: transferBytes - before.transferBytes, maxReadMs: Math.max(0, ...readDurations.slice(before.readCount)), cache: resolver?.cache.stats, cachePhase: resolver ? Object.fromEntries(Object.entries(resolver.cache.stats).filter(([k])=>["hits","misses","shared","evictions","loads"].includes(k)).map(([k,v])=>[k, Number(v)-Number((before.cache as unknown as Record<string,number>)?.[k] ?? 0)])) : undefined, ...measured, limitations: [...measured.limitations, "Child HTTP server excluded from worker RSS", "Loopback HTTP, no TLS/auth service/CDN/Supabase measurement", "Synthetic repeated dense rain; no real JMA latency", "Warm phase is same invocation cache lifetime, not guaranteed across invocations"], schedulerDecision: "CONDITIONAL_PROOF_ONLY" }));
    }
  } finally { http.stop(); }
}
// Imported helpers must not run CLI code.
if (process.argv[1]?.endsWith("n03-http-worker-readiness-proof.ts")) main().catch(error => { console.error(error); process.exitCode = 1; });
