import { describe, expect, test, vi } from "vitest";
import { PNG } from "pngjs";
import { processNationalRainRefinementJobs } from "./nationalRainWorker";

function pngBuffer() {
  const png = new PNG({ width: 1, height: 1 });
  png.data[0] = 255; png.data[1] = 40; png.data[2] = 0; png.data[3] = 255;
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
  zoom: 8,
  tile_x: 221,
  tile_y: 100,
};

describe("processNationalRainRefinementJobs", () => {
  test("marks a valid JMA tile done", async () => {
    const { client, rpc, upsert } = clientFor(job);
    const body = pngBuffer();
    const fetcher = vi.fn().mockResolvedValue(new Response(body, { status: 200 }));

    const resolveMunicipalities = vi.fn().mockResolvedValue([]);
    const result = await processNationalRainRefinementJobs(client, {
      limit: 1,
      fetcher: fetcher as any,
      resolveMunicipalities,
    });

    expect(result.claimed).toBe(1);
    expect(result.done).toBe(1);
    expect(result.failed).toBe(0);
    expect(upsert).toHaveBeenCalled();
    expect(resolveMunicipalities).toHaveBeenCalledTimes(1);
    expect(resolveMunicipalities.mock.calls[0][0].length).toBeGreaterThan(0);
    expect(rpc).toHaveBeenCalledWith("finish_national_rain_refinement_job", {
      p_id: 7, p_success: true, p_error: null,
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
    const fetcher = vi.fn().mockResolvedValue(new Response(pngBuffer(), { status: 200 }));

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
