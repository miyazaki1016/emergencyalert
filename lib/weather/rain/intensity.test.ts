import { describe, expect, it } from "vitest";
import { classifyOfficialIntensity } from "./intensity";

describe("classifyOfficialIntensity", () => {
  it.each([
    [0, "LT_1"],
    [0.9, "LT_1"],
    [1, "1_TO_5"],
    [4.9, "1_TO_5"],
    [5, "5_TO_10"],
    [10, "10_TO_20"],
    [20, "20_TO_30"],
    [30, "30_TO_50"],
    [50, "50_TO_80"],
    [80, "GTE_80"],
  ])("classifies %s mm/h as %s", (value, expected) => {
    expect(classifyOfficialIntensity(value as number)).toBe(expected);
  });

  it("rejects invalid numeric values", () => {
    expect(classifyOfficialIntensity(-1)).toBeNull();
    expect(classifyOfficialIntensity(Number.NaN)).toBeNull();
  });
});
