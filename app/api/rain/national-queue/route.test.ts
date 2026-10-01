import { NextRequest } from "next/server";
import { afterEach, describe, expect, test, vi } from "vitest";

const { fetchObs, fetchForecast, scanTile, createClient, enqueue, stagedMapJobs } = vi.hoisted(() => ({
  fetchObs: vi.fn(),
  fetchForecast: vi.fn(),
  scanTile: vi.fn(),
  createClient: vi.fn(() => ({ marker: "client" })),
  enqueue: vi.fn().mockResolvedValue({ count: 0 }),
  stagedMapJobs: vi.fn((candidates: any[], frame: any, childZoom: number) => {\n    const seen = new Set<string>();\n    return candidates.flatMap((candidate: any) => {\n      const key = `${childZoom}:${candidate.refineX}:${candidate.refineY}`;\n      if (seen.has(key)) return [];\n      seen.add(key);\n      return [{\n        runKey: `${frame.basetime}:${frame.validtime}`,\n        basetime: frame.basetime,\n        validtime: frame.validtime,\n        zoom: childZoom,\n        tileX: candidate.refineX,\n        tileY: candidate.refineY,\n        priority: 0,\n      }];\n    });\n  }),\n}));

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
  stagedRefinementJobsFromCoarseCandidates: stagedMapJobs,
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
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(new Uint8Array([1]), { status: 200 })));

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
    expect(jobs[0]).toMatchObject({ zoom: 6, tileX: 30, tileY: 40 });
    expect((await response.json()).requestedRefinementTiles).toBe(1);
  });


  test("does not partially enqueue when a later forecast frame fails", async () => {
    process.env.NATIONAL_RAIN_WORKER_SECRET = "proof-secret";
    const later = { basetime: "20260930000000", validtime: "20260930001000" };
    fetchObs.mockResolvedValue([current]);
    fetchForecast.mockResolvedValue([forecast, later]);

    let fetchCalls = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
      fetchCalls += 1;
      // observation: 1..6, first forecast: 7..12, later forecast fails at 13
      if (fetchCalls === 13) return new Response("unavailable", { status: 503 });
      return new Response(new Uint8Array([1]), { status: 200 });
    }));
    scanTile.mockImplementation(() => [{ key: `candidate-${fetchCalls}`, refineX: 30, refineY: 40 }]);

    const response = await POST(request("Bearer proof-secret"));
    expect(response.status).toBe(503);
    expect(enqueue).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
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
