import { describe, expect, it } from "vitest";
import { Grib2RainProvider } from "./Grib2RainProvider";

describe("Grib2RainProvider", () => {
  it("turns verified numeric values into rain frames", async () => {
    const provider = new Grib2RainProvider({
      getObservation: async () => [],
      getForecast: async () => [{
        baseTime: "20260920090000",
        validTime: "20260920094000",
        rainfallIntensityMmPerHour: 6.2,
        source: "JMA_HIGH_RESOLUTION_NOWCAST_GRIB2",
      }],
    });

    const [frame] = await provider.getForecastFrames(35.68, 139.76);
    expect(frame.status).toBe("RAIN");
    expect(frame.intensityClass).toBe("5_TO_10");
  });

  it("does not convert invalid numeric data into dry", async () => {
    const provider = new Grib2RainProvider({
      getObservation: async () => [],
      getForecast: async () => [{
        baseTime: "20260920090000",
        validTime: "20260920094000",
        rainfallIntensityMmPerHour: Number.NaN,
        source: "JMA_HIGH_RESOLUTION_NOWCAST_GRIB2",
      }],
    });

    const [frame] = await provider.getForecastFrames(35.68, 139.76);
    expect(frame.status).toBe("NO_DATA");
  });
});
