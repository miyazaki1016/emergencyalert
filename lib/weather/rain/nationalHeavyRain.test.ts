import { describe, expect, it } from "vitest";
import { heavyRainLevel } from "./nationalHeavyRain";

describe("heavyRainLevel", () => {
  it("publishes only JMA heavy-rain classes", () => {
    expect(heavyRainLevel("20_TO_30")).toBeNull();
    expect(heavyRainLevel("30_TO_50")).toBe("HEAVY");
    expect(heavyRainLevel("50_TO_80")).toBe("VERY_HEAVY");
    expect(heavyRainLevel("GTE_80")).toBe("TORRENTIAL");
  });
});
