import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createBoundedPartitionResolver } from "./n03-bounded-partition-loader";
import { datasets, REPRESENTATIVES, STRESS_TILES } from "./n03-readiness-common";
import { densePng } from "./n03-http-worker-readiness-proof";
import { measureWorker } from "./national-rain-throughput-harness";

async function main() {
  const root = process.argv[2], cycles = Number(process.argv[3] ?? 12);
  if (!root || !Number.isInteger(cycles) || cycles < 6) throw new Error("root cycles>=6");
  const resolver = createBoundedPartitionResolver({ datasets: datasets(root, REPRESENTATIVES), read: (code, file) => readFile(join(root, code, file)) });
  const body = densePng(); const queue: { id: number; code: string; created: number }[] = [];
  const rows = []; let submitted = 0, processed = 0, invocationCount = 0;
  const allStarted = performance.now();
  for (let cycle = 0; cycle < cycles; cycle++) {
    for (let i = 0; i < 48; i++) queue.push({ id: ++submitted, code: REPRESENTATIVES[(cycle + i) % 4], created: cycle * 300000 });
    const started = performance.now();
    for (let call = 0; call < 4 && queue.length; call++) {
      const pending = queue.slice(0, 16);
      const jobs = pending.map(j => ({ id: j.id, run_key: `sustained-${j.id}`, basetime: "20260930060000", validtime: "20260930060500", zoom: 8, tile_x: STRESS_TILES[j.code].x, tile_y: STRESS_TILES[j.code].y }));
      const measured = await measureWorker({ jobs, concurrency: 4, fetcher: async () => new Response(new Uint8Array(body)), resolveMunicipalities: resolver.resolve });
      if (measured.result.done !== jobs.length) throw new Error("Sustained proof could not finish bounded local batch");
      queue.splice(0, measured.result.done); processed += measured.result.done; invocationCount++;
      if (resolver.cache.stats.weight > resolver.cache.maxWeight || resolver.cache.stats.activeLoads !== 0) throw new Error("Cache retention/admission invariant failed");
    }
    const elapsedMs = performance.now() - started;
    rows.push({ cycle: cycle + 1, submitted, processed, remaining: queue.length, oldestAgeSeconds: queue.length ? (cycle * 300000 + elapsedMs - queue[0].created) / 1000 : 0, elapsedMs, invocationCount, rssMiB: process.memoryUsage().rss / 1048576, processPeakRssMiB: process.resourceUsage().maxRSS / 1024, cacheWeight: resolver.cache.stats.weight, evictions: resolver.cache.stats.evictions, transferBytes: resolver.metrics.transferBytes });
    console.error(JSON.stringify({ mode: "SUSTAINED_PROGRESS", ...rows.at(-1) }));
  }
  const firstWindow = rows.slice(0, 3), lastWindow = rows.slice(-3);
  console.log(JSON.stringify({ mode: "SUSTAINED_ACTUAL_WORKER_LOCAL_QUEUE_PROOF", submitted, processed, remaining: queue.length, invocationCount, cycles, limit: 16, concurrency: 4, wallElapsedMs: performance.now() - allStarted, cache: resolver.cache.stats, metrics: resolver.metrics, processMaxRssMiB: process.resourceUsage().maxRSS / 1024, firstWindowMaxRssMiB: Math.max(...firstWindow.map(r => r.rssMiB)), lastWindowMaxRssMiB: Math.max(...lastWindow.map(r => r.rssMiB)), rows, limitations: ["Actual back-to-back worker calls and local continuously replenished queue", "Accelerated cycles with virtual 5-minute arrival timestamps; not 1-hour wall-clock proof", "Filesystem IO; no HTTP/JMA/DB latency", "One retained invocation-scoped cache intentionally reused for worst retention stress", "Finite RSS observation and bounded references do not guarantee V8 RSS ceiling"], capacityAccepted: false }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
