import type { NumericRainPoint, RainDataProvider } from "../../types";
import type { OfficialRainFrame } from "../../../types";
import { classifyOfficialIntensity } from "../../../rain/intensity";

export interface JmaGrib2Source {
  getObservation(latitude: number, longitude: number): Promise<NumericRainPoint[]>;
  getForecast(latitude: number, longitude: number): Promise<NumericRainPoint[]>;
}

export class Grib2RainProvider implements RainDataProvider {
  constructor(private readonly source: JmaGrib2Source) {}

  async getObservationFrames(
    latitude: number,
    longitude: number,
  ): Promise<OfficialRainFrame[]> {
    return this.toFrames(await this.source.getObservation(latitude, longitude));
  }

  async getForecastFrames(
    latitude: number,
    longitude: number,
  ): Promise<OfficialRainFrame[]> {
    return this.toFrames(await this.source.getForecast(latitude, longitude));
  }

  private toFrames(points: NumericRainPoint[]): OfficialRainFrame[] {
    return points.map((point) => {
      const intensityClass = classifyOfficialIntensity(point.rainfallIntensityMmPerHour);
      if (intensityClass === null) {
        return {
          baseTime: point.baseTime,
          validTime: point.validTime,
          status: "NO_DATA",
          intensityClass: null,
          rgba: null,
          source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
        };
      }

      return {
        baseTime: point.baseTime,
        validTime: point.validTime,
        status: point.rainfallIntensityMmPerHour > 0 ? "RAIN" : "NO_RAIN",
        intensityClass,
        rgba: null,
        source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST",
      };
    });
  }
}
