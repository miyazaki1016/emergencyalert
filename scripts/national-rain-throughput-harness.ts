import type { SupabaseClient } from "@supabase/supabase-js";
import { performance } from "node:perf_hooks";
import { processNationalRainRefinementJobs, type ClaimedNationalRainJob } from "../lib/weather/rain/nationalRainWorker";
import type { NationalRainMunicipality } from "../lib/weather/rain/nationalRainMunicipalities";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";

// No real DB client is accepted here. Queue/result RPCs are always local stubs.
// JSON serialization is included, but network/DB latency is NOT measured.
export async function measureWorker(options: {
  jobs: ClaimedNationalRainJob[];
  concurrency: number;
  fetcher: typeof fetch;
  resolveMunicipalities: (footprint: HeavyRainPolygon[]) => Promise<NationalRainMunicipality[]>;
  budgetMs?: number;
  processor?: typeof processNationalRainRefinementJobs;
}) {
  let offset = 0, saved = 0, municipalityHits = 0, serializedBytes = 0, enqueuedRefinementJobs = 0;
  let peakRss = process.memoryUsage().rss;
  const sample = () => { peakRss = Math.max(peakRss, process.memoryUsage().rss); };
  const batches: { jobs: number; elapsedMs: number }[] = [];
  let batchStarted = 0, active = 0;
  const errors: string[] = [];
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      sample();
      if (name === "claim_national_rain_refinement_jobs") {
        const batch = options.jobs.slice(offset, offset + Number(args.p_limit));
        offset += batch.length;
        if (batch.length) {
          batchStarted = performance.now(); active = batch.length;
          batches.push({ jobs: batch.length, elapsedMs: 0 });
        }
        return { data: batch, error: null };
      }
      if (name === "finish_national_rain_refinement_job" || name === "defer_national_rain_refinement_job") {
        if (args.p_success === false) errors.push(String(args.p_error));
        if (--active === 0) batches[batches.length - 1].elapsedMs = performance.now() - batchStarted;
        return { data: null, error: null };
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
    from: (table: string) => {
      if (table === "national_rain_refinement_jobs") {
        return { upsert: async (rows: unknown[]) => {
          enqueuedRefinementJobs += rows.length; sample();
          return { error: null };
        } };
      }
      if (table !== "national_rain_refinement_results") throw new Error(`Unexpected table ${table}`);
      return { upsert: async (row: { municipalities: unknown[] }) => {
        serializedBytes += Buffer.byteLength(JSON.stringify(row));
        saved++; municipalityHits += row.municipalities.length; sample();
        return { error: null };
      } };
    },
  } as unknown as SupabaseClient;
  const timer = setInterval(sample, 5);
  const started = performance.now();
  try {
    const result = await (options.processor ?? processNationalRainRefinementJobs)(client, {
      limit: options.jobs.length, concurrency: options.concurrency,
      budgetMs: options.budgetMs ?? 45_000,
      fetcher: options.fetcher, resolveMunicipalities: options.resolveMunicipalities,
    });
    sample();
    if (result.failed || saved !== result.done) throw new Error(`Proof worker failed: ${JSON.stringify({ result, errors, saved })}`);
    const elapsedMs = performance.now() - started;
    return {
      result, elapsedMs, concurrency: options.concurrency,
      budgetMs: options.budgetMs ?? 45_000,
      pending: options.jobs.length - result.claimed + result.deferred,
      municipalityHits, serializedBytes, enqueuedRefinementJobs, batches,
      maxBatchMs: Math.max(0, ...batches.map(b => b.elapsedMs)),
      peakRssMiB: peakRss / 1048576,
      processMaxRssMiB: process.resourceUsage().maxRSS / 1024,
      capacityExtrapolationAllowed: false,
      limitations: ["Local queue/result RPCs; no DB network latency", "CI Node process is not Vercel runtime", "Sample workload is not a nationwide worst-case bound"],
    };
  } finally { clearInterval(timer); }
}
