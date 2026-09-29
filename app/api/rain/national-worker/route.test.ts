import { NextRequest } from "next/server";
import { afterEach, describe, expect, test, vi } from "vitest";

const { processJobs, createClient } = vi.hoisted(() => ({
  processJobs: vi.fn(),
  createClient: vi.fn(() => ({ marker: "client" })),
}));

vi.mock("@/lib/weather/rain/nationalRainQueue", () => ({
  createNationalRainQueueClient: createClient,
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
    expect(processJobs).toHaveBeenCalledWith({ marker: "client" }, { limit: 50 });
    expect(await response.json()).toMatchObject({
      mode: "NATIONAL_RAIN_REFINEMENT_WORKER_PROOF",
      claimed: 50,
      done: 49,
      failed: 1,
      strongPixels: 12,
    });
  });
});
