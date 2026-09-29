import { PNG } from "pngjs";
import type { RainIntensityClass } from "../types";
import { classifyRainPixel } from "../providers/jma/classifyPixel";

export type HeavyRainLevel = "HEAVY" | "VERY_HEAVY" | "TORRENTIAL";

export interface HeavyRainCandidate {
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
  latitude: number;
  longitude: number;
  intensityClass: Extract<RainIntensityClass, "30_TO_50" | "50_TO_80" | "GTE_80">;
  level: HeavyRainLevel;
}

export function heavyRainLevel(intensityClass: RainIntensityClass | null): HeavyRainLevel | null {
  if (intensityClass === "30_TO_50") return "HEAVY";
  if (intensityClass === "50_TO_80") return "VERY_HEAVY";
  if (intensityClass === "GTE_80") return "TORRENTIAL";
  return null;
}

export function scanHeavyRainTile(buffer: Buffer, zoom: number, tileX: number, tileY: number, stride = 2): HeavyRainCandidate[] {
  const png = PNG.sync.read(buffer);
  const found: HeavyRainCandidate[] = [];
  for (let py = 0; py < png.height; py += stride) {
    for (let px = 0; px < png.width; px += stride) {
      const i = (py * png.width + px) * 4;
      const intensityClass = classifyRainPixel({ r: png.data[i], g: png.data[i + 1], b: png.data[i + 2], a: png.data[i + 3] }).intensityClass;
      const level = heavyRainLevel(intensityClass);
      if (!level || !intensityClass) continue;
      const point = worldPixelToLatLon(zoom, tileX * 256 + px, tileY * 256 + py);
      found.push({ tileX, tileY, pixelX: px, pixelY: py, latitude: point.lat, longitude: point.lon, intensityClass: intensityClass as HeavyRainCandidate["intensityClass"], level });
    }
  }
  return found;
}

function worldPixelToLatLon(zoom: number, worldX: number, worldY: number) {
  const size = 256 * 2 ** zoom;
  const lon = worldX / size * 360 - 180;
  const n = Math.PI - 2 * Math.PI * worldY / size;
  const lat = 180 / Math.PI * Math.atan(Math.sinh(n));
  return { lat, lon };
}

export function candidateKey(candidate: Pick<HeavyRainCandidate, "tileX" | "tileY" | "pixelX" | "pixelY">) {
  return `${candidate.tileX}:${candidate.tileY}:${candidate.pixelX}:${candidate.pixelY}`;
}
