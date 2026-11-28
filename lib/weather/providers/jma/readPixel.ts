import { PNG } from "pngjs";
import type { Rgba } from "../../types";

/** A single PNG tile measurement, taken from bytes already fetched for pixel sampling. */
export interface PngTileMeasurement {
  pngBytes: number;
  width: number;
  height: number;
}

export interface PngPixelOptions {
  /** Optional; must not affect rain sampling if instrumentation fails. */
  onMeasured?: (measurement: PngTileMeasurement) => void;
}

export async function fetchPngPixel(
  url: string,
  pixelX: number,
  pixelY: number,
  fetcher: typeof fetch = fetch,
  options?: PngPixelOptions,
): Promise<Rgba> {
  const response = await fetcher(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`JMA tile request failed: ${response.status}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  const png = PNG.sync.read(bytes);
  if (pixelX < 0 || pixelY < 0 || pixelX >= png.width || pixelY >= png.height) {
    throw new Error("Pixel is outside the PNG tile.");
  }

  if (options?.onMeasured) {
    try {
      options.onMeasured({ pngBytes: bytes.byteLength, width: png.width, height: png.height });
    } catch {
      // Telemetry is best-effort and must never break the forecast.
    }
  }

  const i = (png.width * pixelY + pixelX) * 4;
  return {
    r: png.data[i],
    g: png.data[i + 1],
    b: png.data[i + 2],
    a: png.data[i + 3],
  };
}
