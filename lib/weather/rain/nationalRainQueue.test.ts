import { describe, expect, it, vi } from "vitest";
import { claimNationalRainJobs, enqueueNationalRainJobs, queueRows } from "./nationalRainQueue";

const jobs = [{ runKey: "run-1", basetime: "2026-09-29T10:00:00Z", validtime: "2026-09-29T10:05:00Z", zoom: 8, tileX: 221, tileY: 100, priority: 2 }];

describe("national rain queue", () => {
  it("maps proof jobs to database rows", () => {
    expect(queueRows(jobs)[0]).toMatchObject({ run_key: "run-1", tile_x: 221, tile_y: 100, status: "PENDING" });
  });

  it("enqueues idempotently using the queue unique key", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    await enqueueNationalRainJobs({ from } as any, jobs);
    expect(upsert).toHaveBeenCalledWith(expect.any(Array), { onConflict: "run_key,validtime,zoom,tile_x,tile_y", ignoreDuplicates: true });
  });

  it("claims a bounded batch through the atomic rpc", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
    const result = await claimNationalRainJobs({ rpc } as any, 12);
    expect(rpc).toHaveBeenCalledWith("claim_national_rain_refinement_jobs", { p_limit: 12 });
    expect(result).toEqual([{ id: 1 }]);
  });
});
