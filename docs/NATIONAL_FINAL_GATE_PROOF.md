# Final throughput/scheduler proof continuation

Proof-only changes on PR59. Production watch-rain/Push, DB/cron/Vault/Storage,
merge and Production deployment are outside this work.

## Ownership

Use immutable `(dataset,index hash,prefecture,chunk)` identity. Place whole
chunks into eight resource bins using descending encoded bytes and deterministic
least-loaded placement. This avoids geographical naming assumptions and keeps
original polygon components and holes intact. Placement must be frozen and
versioned with the data manifest, never recomputed by independently arriving
workers. Bytes are a balancing proxy, not measured CPU/traffic/RSS weights.

Each parent rain job expands to the intersecting chunks selected by the existing
inclusive bbox index. Child key is parent identity plus chunk identity. Each
child has exactly one owner. A cross-border rain tile must create work in every
intersecting owner, not select one owner from the tile center. Decode one chunk
at a time with the existing 32MiB encoded LRU. The parent is published only after
all expected children finish. Deduplicate municipality codes and gather in
canonical original prefecture/area order, independent of completion order.

The all47 workflow checks official real polygons, every prefecture bbox tile,
full bbox and boundary lines, with completion order reversed. Exact original
whole-loader results are required. Holes and island components are not clipped.
Synthetic tests also reject duplicate/missing children and ambiguous ownership.
Atomic child claims, manifest-version queue fencing and global leases are NOT
implemented in Production; this is a design/geometry proof, not DB readiness.

## Deadline / HTTP

Isolated `national-deadline-worker.ts` is not imported by application routes.
It admits a batch only with 20s work allowance plus 3s final reserve before a
45s deadline. Fetch/resolver signal aborts at 42s; interrupted claimed jobs are
deferred. Remaining jobs stay unclaimed. Existing route worker is unchanged.
Synchronous geometry cannot be preempted, and final RPCs remain local stubs:
no hard target-runtime deadline claim is allowed. A measured 19s cold batch is
an observation, not an upper bound. Abort/reserve tests and real-data HTTP
nominal/constrained c2, cap2 proof must be read together with this limitation.
Production private Storage GET credentials are unavailable in this workspace;
no policy, key, Vault or object changes are made. HTTP data are actual N03 with
assumed loopback bandwidth/latency; **実Storageでは未検証**. No DB/JMA latency.

## Queue-aware scheduling

Normal cap1; pending >=64 or oldest >=60s permits a second invocation. Global
cap2 stays the baseline. Refill immediately after completion; choose the oldest
pending region batch to avoid starvation. The simulator retains every job,
records outstanding queued+processing depth and oldest age, calls, peak
concurrency, conservative summed worker peak RSS, and five-minute snapshots.
Compare continuous cap2 with queue-aware cap2 and cap3 (comparison only; not
accepted). CI502 cold representative profiles plus 1.5 service margin calibrate
24 virtual cycles: normal48, 576, 1536 per five minutes; twelve consecutive1536
bursts followed by twelve48 cycles. All invocations are conservatively cold.
This is a virtual service replay, not sustained live real-IO capacity. It is
intentionally capable of failing: overload must remain visible, never discarded
or disguised by obsolete-frame deletion. Grouping chunk children introduces
additional units; existing parent-job calibration cannot certify their capacity.

## Acceptance

Keep throughput/scheduler gate OPEN until all47 geometry evidence, runtime IO,
atomic owner/global lease lifecycle, HTTP/DB tails, 45s deadline finalization,
and severe demand sustained drain are established. Cap3/4 is not adopted merely
because virtual processing improves. Target Vercel memory allocation and a
measured safe aggregate RSS budget remain required. Production migration is
not ready. CI/test success alone does not change this decision.
