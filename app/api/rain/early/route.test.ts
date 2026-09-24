import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getForecastFrames = vi.fn();

vi.mock("@/lib/weather/providers/jma/JmaEarlyRainForecastProvider", () => ({
  JmaEarlyRainForecastProvider: class {
    getForecastFrames = getForecastFrames;
  },
}));

import { GET } from "./route";

describe("GET /api/rain/early", () => {
  it("returns forecast frames and first rain without sending notifications", async () => {
    const frames = [
      { validTime: "2026-09-25T12:00:00.000Z", status: "NO_RAIN" },
      { validTime: "2026-09-25T13:00:00.000Z", status: "RAIN" },
    ];
    getForecastFrames.mockResolvedValueOnce(frames);

    const response = await GET(new NextRequest("https://example.test/api/rain/early?lat=35.5494&lon=139.7798"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getForecastFrames).toHaveBeenCalledWith(35.5494, 139.7798);
    expect(body.firstRain).toEqual(frames[1]);
    expect(body.forecast).toEqual(frames);
    expect(body.note).toContain("does not send Push");
  });

  it("rejects invalid coordinates", async () => {
    const response = await GET(new NextRequest("https://example.test/api/rain/early?lat=999&lon=139.7798"));
    expect(response.status).toBe(400);
  });

  it("fails closed when JMA data is unavailable", async () => {
    getForecastFrames.mockRejectedValueOnce(new Error("unavailable"));
    const response = await GET(new NextRequest("https://example.test/api/rain/early?lat=35.5494&lon=139.7798"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("JMA_DATA_UNAVAILABLE");
  });
});
