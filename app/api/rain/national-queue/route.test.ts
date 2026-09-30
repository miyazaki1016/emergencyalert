import { NextRequest } from "next/server";
import { afterEach, describe, expect, test, vi } from "vitest";

const { fetchObs, fetchForecast, scanTile, createClient, enqueue, mapJob } = vi.hoisted(() => ({
  fetchObs: vi.fn(),
  fetchForecast: vi.fn(),
  scanTile: vi.fn(),
  createClient: vi.fn(() => ({ marker: "client" })),
  enqueue: vi.fn().mockResolvedValue({ count: 0 }),
  mapJob: vi.fn((candidate: any, frame: any) => ({
    runKey: `${frame.basetime}:${frame.validtime}`,
    basetime: frame.basetime,
    validtime: frame.validtime,
    zoom: 8,
    tileX: candidate.refineX,
    tileY: candidate.refineY,
    priority: 0,
  })),
}));

vi.mock("@/lib/weather/providers/jma/observationTargetTimes", () => ({
  fetchObservationTargetTimes: fetchObs,
}));
vi.mock("@/lib/weather/providers/jma/targetTimes", () => ({
  fetchForecastTargetTimes: fetchForecast,
}));
vi.mock("@/lib/weather/providers/jma/tileUrl", () => ({
  buildJmaRainTileUrl: (_frame: any, _zoom: number, x: number, y: number) => `https://jma.test/${x}/${y}`,
}));
vi.mock("@/lib/weather/rain/nationalHeavyRain", () => ({
  candidateKey: (candidate: any) => candidate.key,
  scanHeavyRainTile: scanTile,
}));
vi.mock("@/lib/weather/rain/nationalRainQueue", () => ({
  createNationalRainQueueClient: createClient,
  enqueueNationalRainJobs: enqueue,
  refinementJobFromCoarseCandidate: mapJob,
}));

import { POST } from "./route";

function request(auth?: string) {
  return new NextRequest("http://localhost/api/rain/national-queue", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

const current = { basetime: "20260930000000", validtime: "20260930000000" };
const forecast = { basetime: "20260930000000", validtime: "20260930000500" };

describe("national rain queue proof route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete process.env.NATIONAL_RAIN_WORKER_SECRET;
  });

  test("rejects unauthenticated requests before scanning or queueing", async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(fetchObs).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  test("excludes current strong rain and deduplicates refinement tiles", async () => {
    process.env.NATIONAL_RAIN_WORKER_SECRET = "proof-secret";
    fetchObs.mockResolvedValue([current]);
    fetchForecast.mockResolvedValue([forecast]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 })));

    let calls = 0;
    scanTile.mockImplementation(() => {
      calls += 1;
      if (calls <= 6) return calls === 1 ? [{ key: "already", refineX: 10, refineY: 20 }] : [];
      if (calls === 7) return [
        { key: "already", refineX: 10, refineY: 20 },
        { key: "new-a", refineX: 30, refineY: 40 },
        { key: "new-b", refineX: 30, refineY: 40 },
      ];
      return [];
    });

    const response = await POST(request("Bearer proof-secret"));
    expect(response.status).toBe(200);
    expect(enqueue).toHaveBeenCalledTimes(1);
    const jobs = enqueue.mock.calls[0][1];
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ zoom: 8, tileX: 30, tileY: 40 });
    expect((await response.json()).queued).toBe(1);
  });

  test("does not enqueue when any coarse JMA tile fetch fails", async () => {
    process.env.NATIONAL_RAIN_WORKER_SECRET = "proof-secret";
    fetchObs.mockResolvedValue([current]);
    fetchForecast.mockResolvedValue([forecast]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));

    const response = await POST(request("Bearer proof-secret"));
    expect(response.status).toBe(503);
    expect(enqueue).not.toHaveBeenCalled();
  });
});
