# Nationwide rain readiness proof — 2026-09-30

This continuation starts at `2a7471c` / CI #500. It adds measurement and cache
components on the feature branch. No application route uses the new partition
loader. Production DB/cron/Vault, Storage, notifications, deployment and merge
are untouched. Throughput/scheduler acceptance is still OPEN.

## Reproducible experiments

CI executes each case sequentially, with a fresh process for each representative
and HTTP worker case. Local exploratory measurements are retained in
`proofs/national-readiness-local.json`; some ran concurrently, so final decisions
must use sequential CI evidence rather than interpret local timings causally.

Representatives: Hokkaido (large multipart dataset), Nagasaki (large island and
coastal complexity), Iwate (Honshu coast with large indivisible polygons), Okinawa
(dispersed islands). Original components retain every coordinate and hole.
The query set covers bbox zoom-8 tiles, a dense stress tile, and whole-prefecture
coverage: 37/8/8/30 cases, **83 total**. Whole, uncached partition and cached
partition must return identical complete ordered administrative-code arrays.
Largest observed indivisible component is Iwate's 4.13 MiB: 1 MiB is only a
packing target, never a hard bound.

Commands (each process separately):

```sh
npx tsx scripts/n03-representative-readiness-proof.ts prepare /tmp/n03-readiness-data 42 /path/to/N03-20260101_42.geojson
# Without source: uses /tmp/n03-readiness-data/42.areas.json
for mode in whole uncached partition compare; do
  npx tsx scripts/n03-representative-readiness-proof.ts "$mode" /tmp/n03-readiness-data 42
done
npx tsx scripts/n03-http-worker-readiness-proof.ts worker /tmp/n03-readiness-data 01 cached nominal 4 50
npx tsx scripts/n03-sustained-worker-readiness-proof.ts /tmp/n03-readiness-data 12
npx tsx scripts/n03-parallel-invocation-readiness-proof.ts /tmp/n03-readiness-data regional 3000 2
npx tsx scripts/national-rain-readiness-scheduler-proof.ts /path/to/parallel.log
```

## Cache decisions

Reject persistent decoded-geometry LRU with a 128 MiB estimated charge budget.
It increased some N03-only peaks and caused Iwate sequential working-set thrash:
local warm 32 jobs still required 152 reads / about 44 seconds. A mixed-4-region
invocation finished only 16 of 32 offered jobs in about 56 seconds. Cache weight
is not actual heap allocation and cannot establish a runtime RSS ceiling.

Use an **encoded-byte LRU limited to 32 MiB** in the proof resolver instead.
Weight is the actual retained Buffer length, reserved before loading. Evict
unused least-recently-used entries; pin users, share each in-flight load, serialize
loads and reject indivisible chunks larger than admission. Decode/intersect one
chunk synchronously, retain no decoded geometry, and preserve source order.
Hit means no network/file reload; parsing on hits is deliberately allowed.
Identity includes dataset date, prefecture and verified manifest digest.
Verify hash/length, unique component identities, original ordinals, complete
index coverage, coordinate validity/closed rings and exact bounds before use.
Manifest digest must come from a trusted immutable manifest when later wired
to real Storage; a digest computed from an untrusted response is not auth.

Unit tests cover LRU eviction/hits, pinned users, single-flight, failed load and
consume cleanup, oversized admission, repeated diverse keys, manifest changes,
component mismatch and exact byte accounting. A 12-cycle real worker stress
tracks retained weight, transfer bytes, RSS and queue outcomes. The reference
bound is strict; finite RSS measurements do not guarantee V8 returns pages or
provide a universal RSS ceiling.

## Communication assumptions and limits

There are no authorized private Storage download credentials in this execution
environment, and partition objects are not in Production. Available Supabase
tools expose metadata/SQL, not a private Storage downloader. Do not retrieve
Vault secrets, weaken policies or upload to solve a measurement problem.
Official private-download requirements:
https://supabase.com/docs/guides/storage/serving/downloads

Use real JSON bytes over read-only localhost HTTP from a separate process.
The server permits GET only with a local proof token, streams chunks, adds
per-request latency and enforces bandwidth shared across all requests:

| Sensitivity profile | Per-request latency | Shared transfer bandwidth |
| --- | ---: | ---: |
| nominal | 80 ms | 8 MiB/s |
| constrained | 250 ms | 2 MiB/s |

These are explicit **assumptions**, not measured Supabase p50/p95 values. Actual
HTTP transfer, parsing, exact raster/footprint, municipalities and worker result
serialization are timed. JMA PNG is synthetic; DB RPCs are local stubs. Server
RSS is excluded from worker RSS. No TLS/CDN/auth-service/compression behavior
is modeled. Warm is within a retained cache's lifetime, not cross-invocation
warmth. Do not call this equivalent to a certified Production Storage benchmark.

## Sustained arrivals and region scheduling

Actual worker stress injects 48 jobs per accelerated cycle, up to four 16-job
invocations, c4, twelve cycles (576 offered). It uses one retained cache to stress
reference retention across diverse workloads. Virtual five-minute timestamps
are tracked; wall-clock execution is back-to-back filesystem work. This measures
real repeated worker behavior and RSS, not an hour of actual network arrivals.

Separate-process comparison dispatches four 16-job invocations against one
shared HTTP uplink: national mixed work, region-specific work, regional with
3-second initial offsets, and a cap-4 regional control. It samples summed worker
RSS from Linux /proc. Completion, pending count, batch tails and process peaks
are retained. This does not establish a fleet memory ceiling on Vercel.

Scheduler replay uses actual cold region/mixed profiles from the cap-2 run,
not sparse-live jobs/45s extrapolations. It preserves every job and tracks
submitted/completed/pending, oldest age and invocation counts over twelve
virtual five-minute cycles. Inputs are 48, 384, 1,536 and 18,432 jobs per cycle;
1.5x service time is an explicit scenario margin. Partial batches conservatively
cost a full measured invocation. Replay is a model, not live backlog throughput.

The four measured region workloads are **not** evidence for ten nationwide
regions. A later rollout may use approximately ten geographic ownership groups,
but needs actual tile distribution, immutable unique job ownership, neighbor
prefecture intersection, fairness, atomic region-scoped claims and global leases.
One physical DB queue with region-scoped claims can provide isolation; separate
physical tables are not required merely for geographic grouping.

## Provisional scheduler candidate, pending final CI evidence

Test a region-scoped dispatcher with c4 within each invocation, limit16,
45-second start budget, at most two simultaneous invocations globally, and
3-second initial offsets. Refill available slots based on observed backlog, not
fixed two calls per five minutes. Use round-robin region fairness and one owner
per forecast/tile; intersect every overlapping prefecture regardless of owner.
This is a proof candidate, not accepted Production sizing or applied SQL.

Reject unlimited area fan-out and the existing fixed 50x2 schedule. A dispatcher
must record pending/processing counts and oldest age by region/forecast, arrival
and finish rates, calls/5min, failures/deferred jobs, p95/max batch/HTTP times,
cache bytes/hits/evictions, peak RSS and regional/global leases. Alert if oldest
pending age reaches 300 seconds or queue grows across consecutive cycles;
freeze new dispatch on lease/budget/RSS admission failure without losing jobs.
Stale-frame handling needs an explicit audited disposition; never silently drop
heavy-rain candidates to make a drain graph look healthy.

Before migration/deploy acceptance: actual authorized Storage reads plus trusted
partition placement, all-47 data validation and workload coverage, target-runtime
memory/headroom, timed DB claim/save/finish, end-to-end last-batch deadline and
timeout handling, sustained real-IO drain across measured severe arrival demand.
If even one-frame 1,536-job arrivals backlog in replay, small-scenario success
does not close the throughput gate. Further CPU/runtime architecture may be
required rather than scaling invocation counts without evidence.

**atomicity gateとthroughput gateは別。**
**未来のソラを信用するな。重要な判断は総覧へ残す。**
