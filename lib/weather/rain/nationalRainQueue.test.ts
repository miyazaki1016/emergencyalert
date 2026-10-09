import { describe, expect, it, vi } from "vitest";
import { childTilesForCandidate, claimNationalRainJobs, completeNationalRainJob, enqueueNationalRainJobs, finishNationalRainJob, queueRows, refinementJobFromCoarseCandidate, stagedRefinementJobsFromCoarseCandidates } from "./nationalRainQueue";

const jobs = [{ runKey: "run-1", basetime: "2026-09-29T10:00:00Z", validtime: "2026-09-29T10:05:00Z", zoom: 8, tileX: 221, tileY: 100, priority: 2 }];

describe("national rain queue", () => {
  it("maps a zoom-4 candidate pixel to its exact zoom-10 refinement tile", () => {
    const job = refinementJobFromCoarseCandidate(
      { tileX: 13, tileY: 6, pixelX: 255, pixelY: 0 },
      { basetime: "2026-09-29T10:00:00Z", validtime: "2026-09-29T10:05:00Z" },
    );
    expect(job).toMatchObject({ zoom: 10, tileX: 895, tileY: 384, scanWindow: { minX: 192, minY: 0, maxX: 255, maxY: 63 } });
  });

  it("maps a zoom-4 candidate directly to the exact bounded zoom-10 window", () => {
    const frame = { basetime: "20260929100000", validtime: "20260929100500" };
    const jobs = stagedRefinementJobsFromCoarseCandidates(
      [{ tileX: 13, tileY: 6, pixelX: 0, pixelY: 0 }],
      frame,
      10,
      4,
    );
    expect(jobs).toEqual([
      expect.objectContaining({
        zoom: 10,
        tileX: 832,
        tileY: 384,
        scanWindow: { minX: 0, minY: 0, maxX: 63, maxY: 63 },
      }),
    ]);
  });

  it("expands a candidate through staged refinement without scanning unrelated tiles", () => {
    const frame = { basetime: "20260929100000", validtime: "20260929100500" };
    const candidate = { tileX: 13, tileY: 6, pixelX: 255, pixelY: 0 };
    expect(childTilesForCandidate(candidate, 4, 6)).toEqual([{ zoom: 6, tileX: 55, tileY: 24, scanWindow: { minX: 252, minY: 0, maxX: 255, maxY: 3 } }]);
    expect(stagedRefinementJobsFromCoarseCandidates([candidate], frame, 6)).toEqual([
      expect.objectContaining({ zoom: 6, tileX: 55, tileY: 24 }),
    ]);
  });

  it("maps a z6 candidate to only its intersecting z8 tile", () => {
    const jobs = stagedRefinementJobsFromCoarseCandidates(
      [{ tileX: 55, tileY: 24, pixelX: 255, pixelY: 255 }],
      { basetime: "20260929100000", validtime: "20260929100500" },
      8,
      6,
    );
    expect(jobs).toEqual([expect.objectContaining({ zoom: 8, tileX: 223, tileY: 99 })]);
  });

  it("preserves every parent candidate window when candidates share one child tile", () => {
    const frame = { basetime: "20260929100000", validtime: "20260929100500" };
    const jobs = stagedRefinementJobsFromCoarseCandidates(
      [
        { tileX: 13, tileY: 6, pixelX: 0, pixelY: 0 },
        { tileX: 13, tileY: 6, pixelX: 1, pixelY: 0 },
      ],
      frame,
      6,
      4,
    );

    expect(jobs).toHaveLength(2);
    expect(jobs.map((job) => job.scanWindow)).toEqual([
      { minX: 0, minY: 0, maxX: 3, maxY: 3 },
      { minX: 4, minY: 0, maxX: 7, maxY: 3 },
    ]);
    expect(jobs.every((job) => job.tileX === 52 && job.tileY === 24)).toBe(true);
  });

  it("maps proof jobs to database rows", () => {
    expect(queueRows(jobs)[0]).toMatchObject({ run_key: "run-1", tile_x: 221, tile_y: 100, status: "PENDING" });
  });

  it("enqueues idempotently using the queue unique key", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    await enqueueNationalRainJobs({ from } as any, jobs);
    expect(upsert).toHaveBeenCalledWith(expect.any(Array), { onConflict: "run_key,validtime,zoom,tile_x,tile_y,scan_min_x,scan_min_y,scan_max_x,scan_max_y", ignoreDuplicates: true });
  });

  it("passes an abort signal to the claim rpc builder", async () => {
    const signal = new AbortController().signal;
    const abortSignal = vi.fn().mockResolvedValue({ data: [{ id: 1, lease_token: "lease-a" }], error: null });
    const rpc = vi.fn().mockReturnValue({ abortSignal });

    const result = await claimNationalRainJobs({ rpc } as any, 1, signal);

    expect(abortSignal).toHaveBeenCalledWith(signal);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("claims a bounded batch through the atomic rpc", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
    const result = await claimNationalRainJobs({ rpc } as any, 12);
    expect(rpc).toHaveBeenCalledWith("claim_national_rain_refinement_jobs", { p_limit: 12 });
    expect(result).toEqual([{ id: 1 }]);
  });
});


it("finish fences mutations with the claimed lease token", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: "OK", error: null });
  await finishNationalRainJob({ rpc } as any, 42, "lease-a", false, "network");
  expect(rpc).toHaveBeenCalledWith("finish_national_rain_refinement_job", {
    p_id: 42,
    p_lease_token: "lease-a",
    p_success: false,
    p_error: "network",
  });
});

it("atomically completes with result or child jobs and surfaces stale ownership", async () => {
  const rpc = vi.fn()
    .mockResolvedValueOnce({ data: "OK", error: null })
    .mockResolvedValueOnce({ data: "STALE_LEASE", error: null });
  const client = { rpc } as any;
  const result = await completeNationalRainJob(client, 42, "lease-a", {
    result: {
      runKey: "run-1", basetime: "2026-09-29T10:00:00Z", validtime: "2026-09-29T10:05:00Z",
      zoom: 10, tileX: 2, tileY: 3, strongPixelCount: 1, municipalities: [{ code: "13101" }],
    },
  });
  expect(result).toBe("OK");
  expect(rpc).toHaveBeenCalledWith("complete_national_rain_refinement_job", expect.objectContaining({
    p_id: 42,
    p_lease_token: "lease-a",
    p_result: expect.objectContaining({ job_id: 42, strong_pixel_count: 1 }),
    p_children: [],
  }));
  expect(await completeNationalRainJob(client, 42, "lease-a", {})).toBe("STALE_LEASE");
});

it("passes an abort signal to the enqueue upsert builder", async () => {
    const signal = new AbortController().signal;
    const abortSignal = vi.fn().mockResolvedValue({ error: null });
    const upsert = vi.fn().mockReturnValue({ abortSignal });
    const from = vi.fn().mockReturnValue({ upsert });

    const result = await enqueueNationalRainJobs({ from } as any, jobs, signal);

    expect(abortSignal).toHaveBeenCalledWith(signal);
  expect(result).toEqual({ count: 1 });
});
