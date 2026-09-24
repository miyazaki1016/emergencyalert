import type { RainFrameStatus, RainIntensityClass, Rgba } from "../../types";
import { classifyRainPixel } from "./classifyPixel";
import { fetchEarlyForecastTargetTimes } from "./earlyForecastTargetTimes";
import { buildJmaEarlyForecastTileUrl } from "./earlyForecastTileUrl";
import { fetchPngPixel } from "./readPixel";
import { latLonToTilePixel } from "./webMercator";

export interface EarlyRainForecastFrame {
  baseTime: string;
  validTime: string;
  status: RainFrameStatus;
  intensityClass: RainIntensityClass | null;
  rgba: Rgba | null;
  source: "JMA_PRECIPITATION_SHORT_RANGE_FORECAST";
}

export class JmaEarlyRainForecastProvider {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async getForecastFrames(lat: number, lon: number): Promise<EarlyRainForecastFrame[]> {
    const targets = await fetchEarlyForecastTargetTimes(this.fetcher);
    const p = latLonToTilePixel(lat, lon, 10);

    return Promise.all(targets.map(async (target) => {
      try {
        const url = buildJmaEarlyForecastTileUrl(target, p.zoom, p.tileX, p.tileY);
        const rgba = await fetchPngPixel(url, p.pixelX, p.pixelY, this.fetcher);
        const classification = classifyRainPixel(rgba);
        return {
          baseTime: target.basetime,
          validTime: target.validtime,
          status: classification.status,
          intensityClass: classification.intensityClass,
          rgba,
          source: "JMA_PRECIPITATION_SHORT_RANGE_FORECAST",
        } satisfies EarlyRainForecastFrame;
      } catch {
        return {
          baseTime: target.basetime,
          validTime: target.validtime,
          status: "FETCH_ERROR",
          intensityClass: null,
          rgba: null,
          source: "JMA_PRECIPITATION_SHORT_RANGE_FORECAST",
        } satisfies EarlyRainForecastFrame;
      }
    }));
  }

  async getFirstRain(lat: number, lon: number): Promise<EarlyRainForecastFrame | null> {
    const frames = await this.getForecastFrames(lat, lon);
    return frames.find((frame) => frame.status === "RAIN") ?? null;
  }
}
