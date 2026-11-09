import { afterEach, describe, expect, test, vi } from "vitest";

const { fetchObs, fetchForecast, scanTile } = vi.hoisted(() => ({
  fetchObs: vi.fn(),
  fetchForecast: vi.fn(),
  scanTile: vi.fn(),
}));

vi.mock("@/lib/weather/providers/jma/observationTargetTimes", () => ({
  fetchObservationTargetTimes: fetchObs,
}));
vi.mock("@/lib/weather/providers/jma/targetTimes", () => ({
  fetchForecastTargetTimes: fetchForecast,
}));
vi.mock("@/lib/weather/providers/jma/tileUrl", () => ({
  buildJmaRainTileUrl: (frame: { validtime: string }, _zoom: number, x: number, y: number) =>
    `https://jma.test/${frame.validtime}/${x}/${y}`,
}));
vi.mock("@/lib/weather/rain/nationalHeavyRain", () => ({
  candidateKey: (candidate: { key: string }) => candidate.key,
  scanHeavyRainTile: scanTile,
}));

import { GET } from "./route";

const observation = { basetime: "20260930000000", validtime: "20260930000000" };
const forecast = { basetime: "20260930000000", validtime: "20260930000500" };

describe("nationwide rain preview fail-closed coverage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("returns unavailable if an observation tile cannot be retrieved", async () => {
    fetchObs.mockResolvedValue([observation]);
    fetchForecast.mockResolvedValue([forecast]);
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      new Response(new Uint8Array([1]), { status: url.includes("/13/5") && url.includes(observation.validtime) ? 503 : 200 })
    ));
    scanTile.mockReturnValue([]);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "NATIONAL_RAIN_SCAN_UNAVAILABLE" });
  });

  test("returns unavailable instead of a partial clear forecast when a forecast tile is missing", async () => {
    fetchObs.mockResolvedValue([observation]);
    fetchForecast.mockResolvedValue([forecast]);
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      new Response(new Uint8Array([1]), { status: url.includes(forecast.validtime) && url.includes("/14/6") ? 503 : 200 })
    ));
    scanTile.mockReturnValue([]);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "NATIONAL_RAIN_SCAN_UNAVAILABLE" });
  });

  test("returns forecast frames when all tiles are available", async () => {
    fetchObs.mockResolvedValue([observation]);
    fetchForecast.mockResolvedValue([forecast]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 })));
    scanTile.mockReturnValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      mode: "NATIONWIDE_HEAVY_RAIN_PROOF",
      frames: [{ validTime: forecast.validtime, counts: { heavy: 0, veryHeavy: 0, torrential: 0 } }],
    });
  });

  test("fails closed when a tile decoder throws", async () => {
    fetchObs.mockResolvedValue([observation]);
    fetchForecast.mockResolvedValue([forecast]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 })));
    scanTile.mockImplementationOnce(() => { throw new Error("invalid tile"); }).mockReturnValue([]);

    const response = await GET();

    expect(response.status).toBe(503);
  });
});
