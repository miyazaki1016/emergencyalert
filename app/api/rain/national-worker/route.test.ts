import { NextRequest } from "next/server";
import { afterEach, describe, expect, test, vi } from "vitest";

const { processJobs, createClient, createLoader, resolveMunicipalities, createPartitionStorage, createPartitionResolver, selectPrefectures } = vi.hoisted(() => ({
  processJobs: vi.fn(),
  createClient: vi.fn(() => ({ marker: "client" })),
  createLoader: vi.fn(() => "loader"),
  resolveMunicipalities: vi.fn(),
  createPartitionStorage: vi.fn(() => ({ loadManifest: vi.fn(async (code: string) => ({ code, indexSha256: "a".repeat(64), index: {} })), readChunk: vi.fn() })),
  createPartitionResolver: vi.fn(() => ({ registerDataset: vi.fn(), resolve: vi.fn(async () => [{ code: "13111", prefecture: "東京都", municipality: "大田区" }]) })),
  selectPrefectures: vi.fn(() => [{ code: "13", name: "東京都", bbox: [136, 20, 154, 36] }]),
}));

vi.mock("@/lib/weather/rain/nationalRainQueue", () => ({
  createNationalRainQueueClient: createClient,
}));

vi.mock("@/lib/weather/rain/n03PreparedStorageLoader", () => ({
  createSupabaseN03AdministrativeAreaLoader: createLoader,
}));

vi.mock("@/lib/weather/rain/n03PartitionStorage", () => ({
  createSupabaseN03PartitionStorage: createPartitionStorage,
}));

vi.mock("@/lib/weather/rain/n03BoundedPartitionResolver", () => ({
  createN03BoundedPartitionResolver: createPartitionResolver,
}));

vi.mock("@/lib/weather/rain/n03PrefectureIndex2026", () => ({
  N03_PREFECTURE_INDEX_2026: [],
}));

vi.mock("@/lib/weather/rain/n03Prefectures", () => ({
  prefecturesForRainPolygons: selectPrefectures,
}));

vi.mock("@/lib/weather/rain/nationalRainMunicipalityResolver", () => ({
  resolveNationalRainMunicipalities: resolveMunicipalities,
}));

vi.mock("@/lib/weather/rain/nationalRainWorker", () => ({
  processNationalRainRefinementJobs: processJobs,
}));

import { POST } from "./route";

function request(auth?: string, query = "") {
  return new NextRequest(`http://localhost/api/rain/national-worker${query}`, {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

describe("national rain worker route", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.NATIONAL_RAIN_WORKER_SECRET;
    delete process.env.NATIONAL_RAIN_N03_PARTITIONS_ENABLED;
  });

  test("rejects requests when worker secret is not configured", async () => {
    const response = await POST(request("Bearer anything"));
    expect(response.status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });

  test("rejects a wrong bearer secret", async () => {
    process.env.NATIONAL_RAIN_WORKER_SECRET = "proof-secret";
    const response = await POST(request("Bearer wrong"));
    expect(response.status).toBe(401);
    expect(processJobs).not.toHaveBeenCalled();
  });

  test("runs the queue worker with a bounded requested limit", async () => {
    process.env.NATIONAL_RAIN_WORKER_SECRET = "proof-secret";
    processJobs.mockResolvedValue({ claimed: 50, done: 49, failed: 1, strongPixels: 12 });

    const response = await POST(request("Bearer proof-secret", "?limit=999"));
    expect(response.status).toBe(200);
    expect(createLoader).toHaveBeenCalledWith({ marker: "client" });
    expect(processJobs).toHaveBeenCalledWith({ marker: "client" }, {
      limit: 50,
      resolveMunicipalities: expect.any(Function),
    });
    const workerOptions = processJobs.mock.calls[0][1];
    const footprint = [{ type: "Polygon", coordinates: [] }];
    const signal = new AbortController().signal;
    await workerOptions.resolveMunicipalities(footprint, signal);
    expect(resolveMunicipalities).toHaveBeenCalledWith(footprint, "loader", undefined, signal);
    expect(await response.json()).toMatchObject({
      mode: "NATIONAL_RAIN_REFINEMENT_WORKER_PROOF",
      claimed: 50,
      done: 49,
      failed: 1,
      strongPixels: 12,
    });
  });

  test("uses partitioned resolver only with explicit opt-in", async () => {
    process.env.NATIONAL_RAIN_WORKER_SECRET = "proof-secret";
    process.env.NATIONAL_RAIN_N03_PARTITIONS_ENABLED = "true";
    processJobs.mockResolvedValue({ claimed: 1, done: 1, failed: 0, strongPixels: 1, deferred: 0 });
    const response = await POST(request("Bearer proof-secret"));
    expect(response.status).toBe(200);
    expect(createPartitionStorage).toHaveBeenCalledWith({ marker: "client" });
    expect(createPartitionResolver).toHaveBeenCalledWith(expect.objectContaining({ datasets: [], read: expect.any(Function) }));
    expect(createLoader).not.toHaveBeenCalled();
    const workerOptions = processJobs.mock.calls[0][1];
    const footprint = [{ type: "Polygon", coordinates: [] }];
    await workerOptions.resolveMunicipalities(footprint);
    expect(selectPrefectures).toHaveBeenCalledWith(footprint, expect.any(Array));
    const storage = createPartitionStorage.mock.results[0].value;
    expect(storage.loadManifest).toHaveBeenCalledWith("13", undefined);
    const resolver = createPartitionResolver.mock.results[0].value;
    expect(resolver.registerDataset).toHaveBeenCalledWith(expect.objectContaining({ code: "13" }));
    expect(resolver.resolve).toHaveBeenCalledWith(footprint, undefined);
  });

  test("fails closed when a selected partition manifest is missing instead of falling back to whole-prefecture data", async () => {
    process.env.NATIONAL_RAIN_WORKER_SECRET = "proof-secret";
    process.env.NATIONAL_RAIN_N03_PARTITIONS_ENABLED = "true";
    const footprint = [{ type: "Polygon", coordinates: [] }];
    createPartitionStorage.mockImplementation(() => ({
      loadManifest: vi.fn().mockRejectedValue(new Error("missing partition manifest")),
      readChunk: vi.fn(),
    }));
    processJobs.mockImplementation(async (_client: unknown, options: { resolveMunicipalities: (footprint: typeof footprint) => Promise<unknown> }) => {
      await options.resolveMunicipalities(footprint);
      return { claimed: 1, done: 1, failed: 0, strongPixels: 1, deferred: 0 };
    });

    const response = await POST(request("Bearer proof-secret"));

    expect(response.status).toBe(503);
    expect(createLoader).not.toHaveBeenCalled();
  });

});
