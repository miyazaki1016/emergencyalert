import type { OfficialRainFrame } from "../types";

export interface RainDataProvider {
  getObservationFrames(latitude: number, longitude: number): Promise<OfficialRainFrame[]>;
  getForecastFrames(latitude: number, longitude: number): Promise<OfficialRainFrame[]>;
}

export interface NumericRainPoint {
  baseTime: string;
  validTime: string;
  rainfallIntensityMmPerHour: number;
  source: "JMA_HIGH_RESOLUTION_NOWCAST_GRIB2";
}
