import type { OfficialRainFrame } from "../../types";
import { latLonToTilePixel } from "./webMercator";
import { fetchForecastTargetTimes } from "./targetTimes";
import { buildJmaRainTileUrl } from "./tileUrl";
import { fetchPngPixel } from "./readPixel";
import { classifyRainPixel } from "./classifyPixel";

export class JmaRainProvider {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async getForecastFrames(
    latitude: number,
    longitude: number,
  ): Promise<OfficialRainFrame[]> {
    const point = latLonToTilePixel(latitude, longitude, 10);
    const targets = await fetchForecastTargetTimes(this.fetcher);

    return Promise.all(
      targets.map(async (target): Promise<OfficialRainFrame> => {
        try {
          const url = buildJmaRainTileUrl(
            target,
            point.zoom,
            point.tileX,
            point.tileY,
          );
          const rgba = await fetchPngPixel(
            url,
            point.pixelX,
            point.pixelY,
            this.fetcher,
          );
          const classification = classifyRainPixel(rgba);

          return {
            baseTime: target.basetime,
            validTime: target.validtime,
            status: classification.status,
            intensityClass: classification.intensityClass,
            rgba,
            source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
            debug: point,
          };
        } catch {
          return {
            baseTime: target.basetime,
            validTime: target.validtime,
            status: "FETCH_ERROR",
            intensityClass: null,
            rgba: null,
            source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
            debug: point,
          };
        }
      }),
    );
  }
}
