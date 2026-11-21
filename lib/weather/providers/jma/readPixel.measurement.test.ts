import { describe, expect, it, vi } from "vitest";
import { PNG } from "pngjs";
import { fetchPngPixel } from "./readPixel";

function makeTile(): Buffer {
  const png = new PNG({ width: 2, height: 2 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 10;
    png.data[i + 1] = 20;
    png.data[i + 2] = 30;
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

function fakeFetch(bytes: Buffer) {
  return vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => Uint8Array.from(bytes).buffer,
  })) as unknown as typeof fetch;
}

describe("fetchPngPixel optional PNG byte measurement", () => {
  it("reports actual fetched PNG bytes without an extra request", async () => {
    const bytes = makeTile();
    const fetcher = fakeFetch(bytes);
    const onMeasured = vi.fn();
    const rgba = await fetchPngPixel("https://example.invalid/tile.png", 1, 1, fetcher, { onMeasured });
    expect(rgba).toEqual({ r: 10, g: 20, b: 30, a: 255 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(onMeasured).toHaveBeenCalledExactlyOnceWith({
      pngBytes: bytes.length,
      width: 2,
      height: 2,
    });
  });

  it("keeps sampling unchanged if measurement callback throws", async () => {
    const bytes = makeTile();
    const rgba = await fetchPngPixel(
      "https://example.invalid/tile.png",
      0,
      0,
      fakeFetch(bytes),
      { onMeasured: () => { throw new Error("telemetry failure"); } },
    );
    expect(rgba).toEqual({ r: 10, g: 20, b: 30, a: 255 });
  });

  it("does not report a measurement when the requested pixel is invalid", async () => {
    const onMeasured = vi.fn();
    await expect(
      fetchPngPixel("https://example.invalid/tile.png", 99, 0, fakeFetch(makeTile()), { onMeasured }),
    ).rejects.toThrow("Pixel is outside the PNG tile");
    expect(onMeasured).not.toHaveBeenCalled();
  });
});
