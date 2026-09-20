import type { OfficialRainFrame } from "../../types";
import type { RainDataProvider } from "../types";
import { fetchObservationTargetTimes } from "./observationTargetTimes";
import { fetchForecastTargetTimes } from "./targetTimes";
import { buildJmaRainTileUrl } from "./tileUrl";
import { fetchPngPixel } from "./readPixel";
import { classifyRainPixel } from "./classifyPixel";
import { latLonToTilePixel } from "./webMercator";

export class JmaPublicImageProvider implements RainDataProvider {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async getObservationFrames(lat: number, lon: number): Promise<OfficialRainFrame[]> {
    const targets = await fetchObservationTargetTimes(this.fetcher);
    return this.readTargets(targets.slice(0, 1), lat, lon);
  }

  async getForecastFrames(lat: number, lon: number): Promise<OfficialRainFrame[]> {
    const targets = await fetchForecastTargetTimes(this.fetcher);
    return this.readTargets(targets, lat, lon);
  }

  private async readTargets(
    targets: Array<{ basetime: string; validtime: string }>,
    lat: number,
    lon: number,
  ): Promise<OfficialRainFrame[]> {
    const p = latLonToTilePixel(lat, lon, 10);
    return Promise.all(targets.map(async (target) => {
      try {
        const url = buildJmaRainTileUrl(target, p.zoom, p.tileX, p.tileY);
        const rgba = await fetchPngPixel(url, p.pixelX, p.pixelY, this.fetcher);
        const classification = classifyRainPixel(rgba);
        return {
          baseTime: target.basetime,
          validTime: target.validtime,
          status: classification.status,
          intensityClass: classification.intensityClass,
          rgba,
          source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
          debug: p,
        } satisfies OfficialRainFrame;
      } catch {
        return {
          baseTime: target.basetime,
          validTime: target.validtime,
          status: "FETCH_ERROR",
          intensityClass: null,
          rgba: null,
          source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
          debug: p,
        } satisfies OfficialRainFrame;
      }
    }));
  }
}
