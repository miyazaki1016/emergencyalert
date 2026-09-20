import { describe, expect, it, vi } from "vitest";
import { PNG } from "pngjs";
import { JmaPublicImageProvider } from "./JmaPublicImageProvider";

function pngPixel(r: number, g: number, b: number, a: number): Uint8Array {
  const png = new PNG({ width: 256, height: 256 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = r;
    png.data[i + 1] = g;
    png.data[i + 2] = b;
    png.data[i + 3] = a;
  }
  return PNG.sync.write(png);
}

function response(body: BodyInit, init?: ResponseInit) {
  return new Response(body, { status: 200, ...init });
}

describe("JmaPublicImageProvider integration boundary", () => {
  it("preserves JMA target count and classifies a complete transparent series as no-rain frames", async () => {
    const targets = [
      { basetime: "20260920120000", validtime: "20260920120500", elements: ["hrpns"] },
      { basetime: "20260920120000", validtime: "20260920121000", elements: ["hrpns"] },
    ];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("targetTimes_N2.json")) return response(JSON.stringify(targets));
      return response(pngPixel(0, 0, 0, 0));
    }) as unknown as typeof fetch;

    const provider = new JmaPublicImageProvider(fetcher);
    const series = await provider.getForecastSeries(35.681236, 139.767125);

    expect(series.expectedFrames).toBe(2);
    expect(series.frames).toHaveLength(2);
    expect(series.frames.every((f) => f.status === "NO_RAIN")).toBe(true);
  });

  it("keeps one failed tile as FETCH_ERROR instead of silently shrinking the series", async () => {
    const targets = [
      { basetime: "20260920120000", validtime: "20260920120500", elements: ["hrpns"] },
      { basetime: "20260920120000", validtime: "20260920121000", elements: ["hrpns"] },
    ];
    let tile = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("targetTimes_N2.json")) return response(JSON.stringify(targets));
      tile += 1;
      if (tile === 2) return new Response("nope", { status: 503 });
      return response(pngPixel(0, 0, 0, 0));
    }) as unknown as typeof fetch;

    const provider = new JmaPublicImageProvider(fetcher);
    const series = await provider.getForecastSeries(35.681236, 139.767125);

    expect(series.expectedFrames).toBe(2);
    expect(series.frames).toHaveLength(2);
    expect(series.frames.map((f) => f.status)).toEqual(["NO_RAIN", "FETCH_ERROR"]);
  });

  it("keeps an unverified opaque color UNKNOWN_PIXEL", async () => {
    const targets = [{ basetime: "20260920120000", validtime: "20260920120500", elements: ["hrpns"] }];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("targetTimes_N2.json")) return response(JSON.stringify(targets));
      return response(pngPixel(1, 2, 3, 255));
    }) as unknown as typeof fetch;

    const provider = new JmaPublicImageProvider(fetcher);
    const series = await provider.getForecastSeries(35.681236, 139.767125);

    expect(series.frames[0].status).toBe("UNKNOWN_PIXEL");
  });
});
