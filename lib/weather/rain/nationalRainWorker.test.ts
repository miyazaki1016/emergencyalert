import { describe, expect, test, vi } from "vitest";
import { PNG } from "pngjs";
import { processNationalRainRefinementJobs } from "./nationalRainWorker";

function pngBuffer() {
  const png = new PNG({ width: 1, height: 1 });
  png.data[0] = 255; png.data[1] = 40; png.data[2] = 0; png.data[3] = 255;
  return PNG.sync.write(png);
}


function boundedWindowPngBuffer() {
  const png = new PNG({ width: 256, height: 256 });
  // Inside the inherited z4->z10 window.
  let i = (20 * 256 + 20) * 4;
  png.data[i] = 255; png.data[i + 1] = 40; png.data[i + 2] = 0; png.data[i + 3] = 255;
  // Strong rain outside the inherited window must not leak into the result.
  i = (200 * 256 + 200) * 4;
  png.data[i] = 255; png.data[i + 1] = 40; png.data[i + 2] = 0; png.data[i + 3] = 255;
  return PNG.sync.write(png);
}

function clientFor(job: Record<string, unknown>) {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "claim_national_rain_refinement_jobs") return { data: [job], error: null };
    if (name === "finish_national_rain_refinement_job") return { data: null, error: null };
    throw new Error(`unexpected RPC ${name}`);
  });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn().mockReturnValue({ upsert });
  return { client: { rpc, from } as any, rpc, from, upsert };
}

const job = {
  id: 7,
  run_key: "run-1",
  basetime: "20260929100000",
  validtime: "20260929100500",
  zoom: 10,
  tile_x: 885,
  tile_y: 100,
};

describe("processNationalRainRefinementJobs", () => {
  test("queues only the next zoom for a strong intermediate tile", async () => {
    const intermediate = { ...job, zoom: 6, tile_x: 55, tile_y: 24 };
    const { client, upsert } = clientFor(intermediate);
    const fetcher = vi.fn().mockResolvedValue(new Response(new Uint8Array(pngBuffer()), { status: 200 }));
    const resolveMunicipalities = vi.fn();

    const result = await processNationalRainRefinementJobs(client, {
      limit: 1,
      fetcher: fetcher as any,
      resolveMunicipalities,
    });

    expect(result.done).toBe(1);
    expect(resolveMunicipalities).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ zoom: 8, status: "PENDING" })]),
      expect.objectContaining({ onConflict: "run_key,validtime,zoom,tile_x,tile_y,scan_min_x,scan_min_y,scan_max_x,scan_max_y" }),
    );
  });

  test("scans only the inherited z10 window and ignores strong pixels outside it", async () => {
    const boundedJob = {
      ...job,
      scan_min_x: 0,
      scan_min_y: 0,
      scan_max_x: 63,
      scan_max_y: 63,
    };
    const { client, upsert } = clientFor(boundedJob);
    const fetcher = vi.fn().mockResolvedValue(
      new Response(new Uint8Array(boundedWindowPngBuffer()), { status: 200 }),
    );
    const resolveMunicipalities = vi.fn().mockResolvedValue([]);

    const result = await processNationalRainRefinementJobs(client, {
      limit: 1,
      fetcher: fetcher as any,
      resolveMunicipalities,
    });

    expect(result.done).toBe(1);
    expect(result.strongPixels).toBe(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ strong_pixel_count: 1 }),
      expect.objectContaining({ onConflict: "job_id" }),
    );
  });

  test("marks a valid JMA tile done", async () => {
    const { client, rpc, upsert } = clientFor(job);
    const body = pngBuffer();
    const fetcher = vi.fn().mockResolvedValue(new Response(new Uint8Array(body), { status: 200 }));

    const municipalities = [{ code: "13111", prefecture: "東京都", municipality: "大田区" }];
    const resolveMunicipalities = vi.fn().mockResolvedValue(municipalities);
    const result = await processNationalRainRefinementJobs(client, {
      limit: 1,
      fetcher: fetcher as any,
      resolveMunicipalities,
    });

    expect(result.claimed).toBe(1);
    expect(result.done).toBe(1);
    expect(result.failed).toBe(0);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ municipalities }),
      expect.objectContaining({ onConflict: "job_id" }),
    );
    expect(resolveMunicipalities).toHaveBeenCalledTimes(1);
    expect(resolveMunicipalities.mock.calls[0][0].length).toBeGreaterThan(0);
    expect(rpc).toHaveBeenCalledWith("finish_national_rain_refinement_job", {
      p_id: 7, p_success: true, p_error: null,
    });
  });

  test("fails closed when municipality resolution fails", async () => {
    const { client, rpc, upsert } = clientFor(job);
    const fetcher = vi.fn().mockResolvedValue(new Response(new Uint8Array(pngBuffer()), { status: 200 }));
    const resolveMunicipalities = vi.fn().mockRejectedValue(new Error("N03 prepared data unavailable"));

    const result = await processNationalRainRefinementJobs(client, {
      limit: 1,
      fetcher: fetcher as any,
      resolveMunicipalities,
    });

    expect(result.done).toBe(0);
    expect(result.failed).toBe(1);
    expect(upsert).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalledWith("finish_national_rain_refinement_job", {
      p_id: 7, p_success: true, p_error: null,
    });
    expect(rpc).toHaveBeenCalledWith("finish_national_rain_refinement_job", {
      p_id: 7, p_success: false, p_error: "N03 prepared data unavailable",
    });
  });

  test("returns a failed fetch to queue completion logic", async () => {
    const { client, rpc } = clientFor(job);
    const fetcher = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));

    const result = await processNationalRainRefinementJobs(client, { limit: 1, fetcher: fetcher as any });

    expect(result.claimed).toBe(1);
    expect(result.done).toBe(0);
    expect(result.failed).toBe(1);
    expect(rpc).toHaveBeenCalledWith("finish_national_rain_refinement_job", {
      p_id: 7, p_success: false, p_error: "JMA tile fetch failed: 503",
    });
  });
});


  test("does not mark done when result persistence fails", async () => {
    const { client, rpc, upsert } = clientFor(job);
    upsert.mockResolvedValueOnce({ error: new Error("result db unavailable") });
    const fetcher = vi.fn().mockResolvedValue(new Response(new Uint8Array(pngBuffer()), { status: 200 }));

    const result = await processNationalRainRefinementJobs(client, { limit: 1, fetcher: fetcher as any });

    expect(result.done).toBe(0);
    expect(result.failed).toBe(1);
    expect(rpc).not.toHaveBeenCalledWith("finish_national_rain_refinement_job", {
      p_id: 7, p_success: true, p_error: null,
    });
    expect(rpc).toHaveBeenCalledWith("finish_national_rain_refinement_job", {
      p_id: 7, p_success: false, p_error: "result db unavailable",
    });
  });


test("leaves unclaimed work pending when the budget expires between small batches", async () => {
  const second = { ...job, id: 8, tile_x: 222 };
  let claims = 0;
  const rpc = vi.fn(async (name: string) => {
    if (name === "claim_national_rain_refinement_jobs") {
      claims += 1;
      return { data: claims === 1 ? [job] : [second], error: null };
    }
    if (name === "finish_national_rain_refinement_job") return { data: null, error: null };
    if (name === "defer_national_rain_refinement_job") return { data: null, error: null };
    throw new Error(`unexpected RPC ${name}`);
  });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const client = { rpc, from: vi.fn().mockReturnValue({ upsert }) } as any;
  let currentTime = 0;
  const now = vi.fn(() => currentTime);
  const fetcher = vi.fn(async () => {
    currentTime = 46_000;
    return new Response(new Uint8Array(pngBuffer()), { status: 200 });
  });

  const result = await processNationalRainRefinementJobs(client, {
    limit: 2,
    concurrency: 1,
    budgetMs: 45_000,
    now,
    fetcher: fetcher as any,
  });

  expect(result.claimed).toBe(1);
  expect(result.done).toBe(1);
  expect(result.failed).toBe(0);
  expect(result.deferred).toBe(0);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(claims).toBe(1);
  expect(rpc).not.toHaveBeenCalledWith("defer_national_rain_refinement_job", expect.anything());
  expect(rpc).not.toHaveBeenCalledWith("finish_national_rain_refinement_job", expect.objectContaining({ p_id: 8 }));
});

test("claims and processes jobs in bounded parallel batches", async () => {
  const jobs = Array.from({ length: 6 }, (_, i) => ({ ...job, id: 20 + i, tile_x: 220 + i }));
  let offset = 0;
  const claimSizes: number[] = [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "claim_national_rain_refinement_jobs") {
      const size = Number(args.p_limit);
      claimSizes.push(size);
      const batch = jobs.slice(offset, offset + size);
      offset += batch.length;
      return { data: batch, error: null };
    }
    if (name === "finish_national_rain_refinement_job") return { data: null, error: null };
    throw new Error(`unexpected RPC ${name}`);
  });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const client = { rpc, from: vi.fn().mockReturnValue({ upsert }) } as any;
  let active = 0;
  let maxActive = 0;
  const fetcher = vi.fn(async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return new Response(new Uint8Array(pngBuffer()), { status: 200 });
  });

  const result = await processNationalRainRefinementJobs(client, {
    limit: 6,
    concurrency: 4,
    fetcher: fetcher as any,
  });

  expect(result.claimed).toBe(6);
  expect(result.done).toBe(6);
  expect(result.failed).toBe(0);
  expect(claimSizes).toEqual([4, 2]);
  expect(maxActive).toBe(4);
});

test("does not claim another batch after the execution budget is exhausted", async () => {
  const firstBatch = Array.from({ length: 4 }, (_, i) => ({ ...job, id: 40 + i, tile_x: 230 + i }));
  let claims = 0;
  const rpc = vi.fn(async (name: string) => {
    if (name === "claim_national_rain_refinement_jobs") {
      claims += 1;
      return { data: claims === 1 ? firstBatch : [{ ...job, id: 99 }], error: null };
    }
    if (name === "finish_national_rain_refinement_job") return { data: null, error: null };
    throw new Error(`unexpected RPC ${name}`);
  });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const client = { rpc, from: vi.fn().mockReturnValue({ upsert }) } as any;
  let currentTime = 0;
  let completed = 0;
  const now = vi.fn(() => currentTime);
  const fetcher = vi.fn(async () => {
    completed += 1;
    if (completed === 4) currentTime = 46_000;
    return new Response(new Uint8Array(pngBuffer()), { status: 200 });
  });

  const result = await processNationalRainRefinementJobs(client, {
    limit: 8,
    concurrency: 4,
    budgetMs: 45_000,
    now,
    fetcher: fetcher as any,
  });

  expect(result.claimed).toBe(4);
  expect(result.done).toBe(4);
  expect(claims).toBe(1);
});
