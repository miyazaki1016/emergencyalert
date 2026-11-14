import { PNG } from "pngjs";
import { classifyRainPixel } from "../providers/jma/classifyPixel";
import type { RainIntensityClass } from "../types";

/** Isolated read-only proof: no changes to production >=30mm/h alerts. */
const AT_LEAST_1: ReadonlySet<RainIntensityClass> = new Set([
  "1_TO_5", "5_TO_10", "10_TO_20", "20_TO_30",
  "30_TO_50", "50_TO_80", "GTE_80",
]);

export type LightRainScanResult = {
  rainPixels: number;
  belowOnePixels: number;
  unknownPixels: number;
  sampledPixels: number;
};

/** Full-pixel scan: never use stride=2; unknown pixels are not dry. */
export function scanJmaTileAtLeast1mm(buffer: Buffer): LightRainScanResult {
  const png = PNG.sync.read(buffer);
  const result: LightRainScanResult = {
    rainPixels: 0, belowOnePixels: 0, unknownPixels: 0, sampledPixels: 0,
  };
  for (let i = 0; i < png.data.length; i += 4) {
    result.sampledPixels++;
    const classified = classifyRainPixel({
      r: png.data[i], g: png.data[i + 1], b: png.data[i + 2], a: png.data[i + 3],
    });
    if (classified.intensityClass && AT_LEAST_1.has(classified.intensityClass)) result.rainPixels++;
    else if (classified.intensityClass === "LT_1") result.belowOnePixels++;
    else if (classified.status === "UNKNOWN_PIXEL") result.unknownPixels++;
  }
  return result;
}

/** Exact rainy pixel coordinates for downstream z10/N03 footprint matching.
 * Keep every pixel; no stride or center-point-only municipality guess.
 */
export function locateJmaRainPixelsAtLeast1mm(buffer: Buffer, zoom: number, tileX: number, tileY: number): Array<{ pixelX: number; pixelY: number; longitude: number; latitude: number }> {
  const png = PNG.sync.read(buffer);
  if (png.width !== 256 || png.height !== 256) throw new Error("Unexpected JMA tile dimensions");
  const points = [];
  const size = 256 * 2 ** zoom;
  for (let py = 0; py < png.height; py++) for (let px = 0; px < png.width; px++) {
    const i = (py * png.width + px) * 4;
    const result = classifyRainPixel({ r: png.data[i], g: png.data[i + 1], b: png.data[i + 2], a: png.data[i + 3] });
    if (result.status === "UNKNOWN_PIXEL") throw new Error("Unrecognized JMA pixel");
    if (!result.intensityClass || !AT_LEAST_1.has(result.intensityClass)) continue;
    const worldX = tileX * 256 + px + 0.5;
    const worldY = tileY * 256 + py + 0.5;
    const n = Math.PI - 2 * Math.PI * worldY / size;
    points.push({ pixelX: px, pixelY: py, longitude: worldX / size * 360 - 180,
      latitude: Math.atan(Math.sinh(n)) * 180 / Math.PI });
  }
  return points;
}
