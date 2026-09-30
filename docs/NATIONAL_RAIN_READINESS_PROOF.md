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

### Sequential CI readiness result / final gate — 2026-09-30

Code `a80652ddeb5503e1d5e5f5931fda3863c265090c`: CI #501, National #205,
N03 #125 all SUCCESS; 179 tests, local queue lifecycle and build passed.
Raw artifact 11086367848; exact structured results:
`docs/proofs/national-readiness-ci501.json`. All measurements below are sequential
CI, with the documented synthetic/local HTTP assumptions. They are not measured
Production Storage latency or target-runtime capacity.

| N03-only representative (queries) | Whole sec / RSS MiB / read MiB | Bounded partition sec / RSS MiB / read MiB |
| --- | ---: | ---: |
| Hokkaido (37) | 1.154 / 331.86 / 39.68 | 1.839 / 180.83 / 74.42 |
| Nagasaki (8) | 0.494 / 245.62 / 28.38 | 1.041 / 179.09 / 29.16 |
| Iwate (8) | 0.479 / 236.20 / 27.48 | 0.993 / 183.93 / 28.17 |
| Okinawa (30) | 0.472 / 211.04 / 17.69 | 0.683 / 146.29 / 18.18 |

All **83 ordered results match** whole/uncached/cached. Full-coverage queries
and cache churn make cumulative partition reads exceed a single whole load;
partitioning is a memory reduction, not a universal IO/time reduction.
Original boundaries/holes are retained; largest Iwate chunk is 4,333,892 bytes.

Actual c4 Hokkaido worker over nominal HTTP, 50 jobs: whole cold 13.243 s /
836.60 MiB / 39.68 MiB transferred (1 GET), bounded cold 13.300 s /
371.80 MiB / 12.16 MiB (13 GETs). Bounded warm 10.339 s / 373.81 MiB /
zero GETs and zero bytes. c1 bounded cold 13.194 s / 263.09 MiB: c4 provides
no meaningful gain on this repeated CPU workload. For isolated regions c4,
32 cold jobs: Nagasaki 11.780 s / 372.83 MiB, Iwate 15.537 s / 431.70 MiB,
Okinawa 8.899 s / 353.99 MiB. All their warm phases perform zero GETs.
Constrained Hokkaido cold 32 jobs: 16.174 s, max batch 10.367 s.

**Reject nationwide mixed cache locality.** Mixed four-region c4 16 jobs cold
55.919 s / warm 55.802 s, each 244 GETs and 250.35 MiB transferred; its maximum
batch is 14.062 s. A nominally warm cache does not mean cache hits when the
working set exceeds 32 MiB. Near-60-second completion without real JMA/DB is
not a safe route limit. The initial 45-second budget only controls batch starts.

Sustained actual worker filesystem stress: 12 accelerated cycles, 48 arrivals
per cycle, 576/576 completed, zero pending/oldest age, 36 invocations, 156.225 s
wall time. Peak RSS 366.66 MiB; first/last 3-cycle sampled maxima 338.99/344.86
MiB. Encoded retained bytes peaked at 33,550,023 (<33,554,432 limit), 8,755
LRU evictions, one active load/decode maximum. Mixed workload had **zero cache
hits and 9,450,485,424 bytes read**. Bounded retention is verified; this does
not certify hour-long network arrivals or an absolute V8 RSS bound.

| Four cold invocations, 16 offered each | Wall sec | Summed sampled worker peak RSS MiB |
| --- | ---: | ---: |
| National mixed, global cap2 | 102.369 | 635.13 |
| Region-specific, global cap2 | 19.272 | 673.47 |
| Region-specific, 3s offsets, cap2 | 18.118 | 702.06 |
| Region-specific, cap4 | 15.160 | 1167.79 |

National mixed finishes only 48/64 offered; regional alternatives finish 64/64.
Do not conflate elapsed times for unequal completed work. Region isolation
reduces repeated loads and protects other regions from mixed-cache churn.
Three-second offsets provide no demonstrated memory benefit (702 vs 673 MiB);
keep them as a sensitivity candidate, not an accepted improvement. Cap4 buys
about four seconds over cap2 but increases aggregate memory materially; reject
it as the default without runtime memory allocation and higher-demand proof.

Measured-service replay (12 virtual 5-minute cycles, 1.5x service margin):

| Jobs/5min | Policy | Submitted / completed / remaining | Oldest sec | Calls |
| --- | --- | ---: | ---: | ---: |
| 48 | national | 576 / 576 / 0 | 0 | 48 |
| 384 | national | 4608 / 1128 / 3480 | 3000 | 96 |
| 384 | regional or staggered | 4608 / 4608 / 0 | 0 | 288 |
| 1536 | national | 18432 / 1128 / 17304 | 3600 | 96 |
| 1536 | regional or staggered | 18432 / 8944 / 9488 | 2100 | 561 |
| 18432 | regional or staggered | 221184 / 8944 / 212240 | 3600 | 561 |

At 384/5min with 75% Hokkaido, regional/staggered still completes 4608/4608;
national leaves 3480. These are model outputs calibrated from cold worker
service, not live sustained Production drains. The staggered replay uses the
same regional calibration plus eligibility offsets; it does not independently
establish a throughput improvement. Four representative groups cannot validate
ten nationwide groups. Even one-frame severe 1536/5min fails: gate remains OPEN.

Adopt for further proof: exact component partitions, encoded 32 MiB LRU,
identity/integrity checks, regional locality. Next dispatcher experiment uses
c4 (compare c1), region-scoped limit16, global cap2, zero initial offset as the
baseline and 3s as a comparison; backlog-driven refill instead of two fixed
calls. The 384 replay needs 24 calls/5min (288/12), not two. This is a measured
scenario requirement, not approved Production frequency. Safe universal limit,
Production call count, geographic group count and final offsets remain unset.
Monitor pending/processing/oldest age by region+frame, arrival/completion rate,
invocations/5min, retries/deferred/failures, batch/HTTP tails, RSS, cache churn,
and global leases. Alert at oldest age >=300s or consecutive queue growth.

A follow-up measurement-report fix scopes maxReadMs to each cold/warm phase;
CI #501's maxReadMs was cumulative, so use per-phase requests/bytes and maxBatchMs
above. The fix does not change worker processing, timing or these conclusions.

**Production移行不可。Atomicity gate closed; throughput/scheduler gate OPEN.**
Remaining: authorized real Storage/DB/JMA IO, trusted immutable partition
placement, all-47 validation/diverse tiles, Vercel-runtime memory and last-batch
timeouts, atomic region ownership/global leases/fairness, audited stale-frame
policy and severe-demand sustained real-IO drain. No Production migrations,
cron/Vault/Storage changes, notification connections, PR merge or Production
deploy are executed. New loader remains proof-only, absent from application routes.


### Supplemental cold-batch admission proof — 2026-09-30

Evidence: `docs/proofs/national-readiness-supplement.json`, local sensitivity
using the same scripts as CI #501; local hardware is not directly comparable
with the CI runner. Constrained loopback HTTP (assumed 250ms/request, shared
2MiB/s), c4 / 16 offered: Iwate completes 16 in 22.817s, peak RSS about445MiB,
19 GETs, maximum cold batch **19.018s**; Nagasaki completes16 in16.990s,
maximum cold batch13.867s. Warm phases issue zero GETs. Mixed nominal c4/8
still requires122 GETs in each cold/warm phase and about28seconds.

A 19.018-second cold batch exceeds the15-second reserve after a45-second
start cutoff: beginning such a batch at second44 can exceed60seconds before
final DB RPCs. Limit16 is a conditional proof setting, **not an accepted safe
Production limit**. Remaining-time admission, cancellation, bounded fetches
and final RPC budgets require further implementation and target-runtime proof.
Throughput/scheduler gate remains OPEN; no Production actions are authorized
by these measurements. Approximately10 future ownership groups (Hokkaido,
Tohoku, Kanto, Hokuriku/Koshin, Tokai, Kinki, Chugoku, Shikoku, Kyushu, Okinawa)
are a design candidate only: four measured workload classes do not validate
all47 prefectures, geographic ownership or neighboring-prefecture detection.

**atomicity gateとthroughput gateは別。**
**未来のソラを信用するな。重要な判断は総覧へ残す。**


### Follow-up CI #502 SUCCESS — 2026-09-30

Runtime code `c8da0d9c702fd9093aebebef6a6f8222b06561a9`: CI #502,
National #206, N03 #126 all SUCCESS. Artifact11087306586 / run36693482756;
full structured evidence: `docs/proofs/national-readiness-ci502.json`.
The report-only maxReadMs correction is verified: single-region warm phases
have zero GETs, zero bytes and maxReadMs0. All83 ordered representative queries
still match, and cache peak retained bytes remain below32MiB.

Repeated nominal localhost HTTP Hokkaido50jobs c4: whole15.990s /1038.63MiB
process peak RSS versus encoded16.716s /374.86MiB; c1 encoded16.795s /264.13MiB.
Measured transfer bytes remain41,606,326 whole vs12,748,337 partitioned.
Timing and allocator peaks vary across CI runs: retain both CI501 and502,
not a best-run Production estimate. Sustained accelerated local worker again
finishes576/576 with zero pending in36 calls; wall204.89s, peak366.42MiB,
first/last three-cycle maxima338.98/326.49MiB. This is finite local evidence.

Separate-process repeat: nationalmixed cap2 completes48/64 in104.713s,
aggregate634.21MiB; regionalcap2 completes64/64 in22.356s /667.99MiB;
regional3s offsets21.0s /688.81MiB; regionalcap4 18.333s /1215.28MiB.
Again offsets do not lower measured memory. All profiles use assumed loopback
latency/bandwidth and synthetic dense rain, not private Production Storage IO.

Updated cold-service replay,12 virtual five-minute cycles /1.5x margin:
regional384/cycle finishes4608 with no remaining jobs using288 calls;
1536/cycle finishes7728, leaves10704, oldest2100s,485 calls;
18432/cycle leaves213456, oldest3600s. Compared with CI501, lower measured
service increases backlog; the decision remains **Production不可 / gate OPEN**.

Read-only live JMA discovery finds26 refinement candidates across12 frames;
selects4 jobs on Okinawa zoom8(218,107),333 upcoming strong pixels total.
Cold prepared N03 path completes4/4 in0.527s (discovery14.263s separately),
process peak253.61MiB; warm0.100s. Municipality intersection executes but returns
**zero municipality hits**: this is not land-impact throughput and cannot close
the gate. N03 is local prepared data through the existing Storage loader code,
not private Storage HTTP; result/queue RPCs remain local stubs.

Proof and decision materials are complete; final scheduler sizing, real IO,
all47 regional ownership, production loader integration, runtime deadline and
severe-load drain remain uncompleted. All Production changes, merge and deploy
remain unexecuted. Atomicity gate and throughput gate remain separate.
