import { PNG } from "pngjs";
import type { Rgba } from "../../types";

export async function fetchPngPixel(
  url: string,
  pixelX: number,
  pixelY: number,
  fetcher: typeof fetch = fetch,
): Promise<Rgba> {
  const response = await fetcher(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`JMA tile request failed: ${response.status}`);

  const png = PNG.sync.read(Buffer.from(await response.arrayBuffer()));
  if (pixelX < 0 || pixelY < 0 || pixelX >= png.width || pixelY >= png.height) {
    throw new Error("Pixel is outside the PNG tile.");
  }

  const i = (png.width * pixelY + pixelX) * 4;
  return {
    r: png.data[i],
    g: png.data[i + 1],
    b: png.data[i + 2],
    a: png.data[i + 3],
  };
}
