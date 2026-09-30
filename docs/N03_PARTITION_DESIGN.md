# N03 polygon partition design — 2026-09-30

Decision: continue with exact polygon-component chunks, starting with Hokkaido.
This is an offline design proof, not an application loader or an approved
Production format. Existing 47-prefecture Storage objects remain untouched.

## Partition unit and correctness

Split a MultiPolygon into its original Polygon components. Keep each exterior
and every hole together; do not clip boundaries, simplify coordinates or split
an indivisible Polygon. Pack spatially adjacent components into chunks with a
soft 1 MiB JSON target. An index maps component bbox and original area/polygon
ordinals to a chunk and records chunk bytes/hash. Select chunks by rain bbox,
then use the existing exact intersection code on selected components. Bbox
selection alone never establishes a municipality hit. Merge by original area
ordinal, retaining original N03 order and one result per administrative code.

This avoids keeping the complete prefecture geometry alive. Four named regions
of Hokkaido would still have uneven sizes and unnecessary geometry loads; a
municipality can also have distant islands. Original components plus an index
preserve that identity without introducing artificial geographic boundaries.

## Local evidence

See `proofs/n03-hokkaido-partition-design.json`. Official N03-20260101 Hokkaido
source was converted by the existing parser. Exact coordinate reconstruction
passed for all 9,556 components in 194 administrative-code rows (including wards).
Prepared JSON is 39.68 MiB; index is 1.24 MiB. There are 46 chunks totaling
40.47 MiB. Largest chunk is 1.27 MiB: one original polygon exceeds the soft
target. This design does **not** guarantee a 1 MiB upper bound.

| Fresh-process N03-only variant | 37 queries elapsed | Process peak RSS |
| --- | ---: | ---: |
| Complete prepared prefecture | 1.191 s | 402.71 MiB |
| Index + serial chunk reads, no geometry cache | 1.539 s | 152.11 MiB |

All 37 complete ordered result arrays matched: stress tile 228/94, 35 zoom-8
tile rectangles covering the prefecture bbox, and whole-prefecture coverage.
The stress tile returned 44 administrative-code results; it read 13 chunks,
12.16 MiB, with 229 selected components out of 2,408 decoded components.
Packing overhead and increased request count need further optimization.

These are local synthetic footprint / filesystem measurements. They exclude
JMA PNG, worker concurrency, DB and Storage HTTP. The extra time is a tradeoff;
the 152 MiB result is **not** the worker peak and cannot be subtracted from the
previous approximately 1 GiB worker peak. Throughput acceptance remains open.

## Other prefectures

The component format is generic across all prefectures. Prioritize by actual
prepared bytes and measured selectivity, not land area. Read-only metadata for
all 47 existing objects is in `proofs/n03-prepared-size-snapshot.json`.

| Priority candidate | Prepared MiB |
| --- | ---: |
| Hokkaido | 39.7 |
| Nagasaki | 28.4 |
| Iwate | 27.5 |
| Miyagi | 22.9 |
| Kagoshima | 21.9 |
| Okinawa | 17.7 |
| Mie | 17.0 |

Next candidates are Shizuoka (14.0), Ishikawa (13.8), Tokyo (13.3), Ehime (12.6).
This ranks investigation effort, not proven benefits. Geometry distribution,
chunk selectivity and HTTP overhead decide whether partitioning helps each
prefecture. Small datasets may remain whole. Hokkaido is the only real dataset
with partition equivalence and memory evidence at this checkpoint.

## Next implementation gate

Before wiring into the proof worker, harden manifest/part schema and identity
validation. Missing/corrupt selected chunks must fail the job, never become
an empty result. Use immutable versioned data and source/manifest fingerprints;
any future partition upload uses a new namespace after authorization, not an
overwrite of the verified prepared data.

Use one invocation-wide single-flight loader keyed by dataset/prefecture/chunk.
Bound retained decoded geometry and simultaneous decoding across all four jobs;
do not create four independent full caches. Pin in-use chunks, evict unused
chunks, and defer work when admission capacity is exhausted. Serialized bytes
are not decoded heap bytes: measure decoded coordinate counts and RSS/headroom
before selecting limits. Oversized polygons need explicit admission handling.

Then measure actual bounded worker c1/c4 on diverse Hokkaido tiles, mixed
prefectures, cold/warm HTTP, repeated requests, cache eviction and oversized
parts. Check exact result equality against the whole loader, completion under
45-second start budget/60-second route limit, backlog age and sustained drain.
Only those measurements can set safe job and invocation limits.

Region workers can distribute CPU across invocations after memory admission is
proven. Assign each forecast/zoom-8 tile one owner; a job still intersects all
overlapping prefectures, including neighbors. Region grouping cannot remove
the global invocation cap, deadline or shared backlog controls.

## Reproduce without Production access

`scripts/n03-hokkaido-partition-design-proof.ts` supports:

```sh
npx tsx scripts/n03-hokkaido-partition-design-proof.ts prepare /tmp/n03-partition /path/to/N03-20260101_01.geojson
# Or: prepare-prepared /tmp/n03-partition /path/to/01.areas.json
npx tsx scripts/n03-hokkaido-partition-design-proof.ts full /tmp/n03-partition
npx tsx scripts/n03-hokkaido-partition-design-proof.ts partitioned /tmp/n03-partition
npx tsx scripts/n03-hokkaido-partition-design-proof.ts compare /tmp/n03-partition
```

CI reuses locally generated Hokkaido prepared data from the stress proof, runs
each variant in a separate process, asserts ordered equivalence and retains the
measurement log. Memory/time are observations, not hardware-independent pass
thresholds. Five unit tests cover holes, islands, ordering/deduplication,
corruption/missing chunks and indivisible oversized polygons.
