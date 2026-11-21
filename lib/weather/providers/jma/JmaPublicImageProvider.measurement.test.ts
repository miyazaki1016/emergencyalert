import { describe, expect, it, vi } from "vitest";
import { PNG } from "pngjs";
import { JmaPublicImageProvider } from "./JmaPublicImageProvider";
import { JmaTileSizeCollector } from "./tileSizeCollector";

function pngTile(): Uint8Array {
  const png = new PNG({ width: 256, height: 256 });
  png.data.fill(0);
  return Uint8Array.from(PNG.sync.write(png));
}

describe("JMA provider PNG size collection integration", () => {
  it("collects PNG sizes from the existing image fetch with metadata", async () => {
    const tile = pngTile();
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("targetTimes_N1.json")) {
        return { ok: true, json: async () => [{
          basetime: "20261029090000",
          validtime: "20261029090000",
          elements: ["hrpns"],
        }] };
      }
      if (url.endsWith(".png")) {
        return { ok: true, arrayBuffer: async () => tile.buffer };
      }
      throw new Error("Unexpected URL: " + url);
    }) as unknown as typeof fetch;
    const collector = new JmaTileSizeCollector();
    const provider = new JmaPublicImageProvider(fetcher, collector.record);
    const frames = await provider.getObservationFrames(35.66, 139.82);

    expect(frames).toHaveLength(1);
    expect(frames[0].status).not.toBe("FETCH_ERROR");
    expect(fetcher).toHaveBeenCalledTimes(2); // targetTimes + one PNG
    expect(collector.summary()).toMatchObject({
      count: 1, totalBytes: tile.byteLength, minBytes: tile.byteLength,
      maxBytes: tile.byteLength, meanBytes: tile.byteLength,
    });
    expect(collector.snapshot()[0]).toMatchObject({
      baseTime: "20261029090000",
      validTime: "20261029090000",
      zoom: 10,
      width: 256,
      height: 256,
    });
  });

  it("does not fail forecast if the measurement collector throws", async () => {
    const tile = pngTile();
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("targetTimes_N1.json")) {
        return { ok: true, json: async () => [{
          basetime: "20261029090000",
          validtime: "20261029090000",
          elements: ["hrpns"],
        }] };
      }
      return { ok: true, arrayBuffer: async () => tile.buffer };
    }) as unknown as typeof fetch;
    const provider = new JmaPublicImageProvider(fetcher, () => { throw new Error("collector unavailable"); });
    const frames = await provider.getObservationFrames(35.66, 139.82);
    expect(frames[0].status).not.toBe("FETCH_ERROR");
  });
});
