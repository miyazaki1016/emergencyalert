import { describe, expect, it } from "vitest";
import { buildJmaEarlyForecastTileUrl } from "./earlyForecastTileUrl";

describe("buildJmaEarlyForecastTileUrl", () => {
  it("builds a rasrf tile URL for a none member", () => {
    expect(buildJmaEarlyForecastTileUrl(
      { basetime: "20260924130000", validtime: "20260924150000", member: "none" },
      10,
      909,
      403,
    )).toBe(
      "https://www.jma.go.jp/bosai/jmatile/data/rasrf/20260924130000/none/20260924150000/surf/rasrf/10/909/403.png",
    );
  });

  it("builds a rasrf tile URL for an immed member", () => {
    expect(buildJmaEarlyForecastTileUrl(
      { basetime: "20260924160000", validtime: "20260924170000", member: "immed" },
      10,
      909,
      403,
    )).toBe(
      "https://www.jma.go.jp/bosai/jmatile/data/rasrf/20260924160000/immed/20260924170000/surf/rasrf/10/909/403.png",
    );
  });
});
