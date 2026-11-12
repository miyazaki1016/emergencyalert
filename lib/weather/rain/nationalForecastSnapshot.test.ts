import { describe, expect, it } from "vitest";
import { readNationalForecastSnapshot, type NationalForecastSnapshot } from "./nationalForecastSnapshot";

const now = Date.UTC(2026, 10, 12, 11, 31);
const snapshot: NationalForecastSnapshot = {
  source: "JMA", n03Version: "20260101", basetime: "20261112112500",
  frames: ["113500", "114000", "114500", "115000", "115500", "120000"].map(time => ({
    validTime: `20261112${time}`,
    municipalities: [{ code: "28223", prefecture: "兵庫県", municipality: "丹波市", minimumMmPerHour: 30 }],
  })),
};

describe("national forecast snapshot", () => {
  it("exposes only upcoming times and keeps municipality and intensity", () => {
    const result = readNationalForecastSnapshot(snapshot, now + 5 * 60_000);
    expect(result.frames).toHaveLength(5);
    expect(result.frames[0].municipalities[0]).toEqual(snapshot.frames[0].municipalities[0]);
  });

  it("rejects stale and incomplete scans instead of publishing an empty forecast", () => {
    expect(() => readNationalForecastSnapshot(snapshot, now + 15 * 60_000)).toThrow("Stale");
    expect(() => readNationalForecastSnapshot({ ...snapshot, frames: snapshot.frames.slice(1) }, now)).toThrow("Invalid");
  });
});
