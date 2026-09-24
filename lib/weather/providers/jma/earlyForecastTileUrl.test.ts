import { describe, expect, it } from "vitest";
import { buildJmaEarlyForecastTileUrl } from "./earlyForecastTileUrl";

describe("buildJmaEarlyForecastTileUrl", () => {
  it("builds a rasrf tile URL", () => {
    expect(buildJmaEarlyForecastTileUrl(
      { basetime: "20260924130000", validtime: "20260924150000" },
      10,
      909,
      403,
    )).toBe(
      "https://www.jma.go.jp/bosai/jmatile/data/rasrf/20260924130000/none/20260924150000/surf/rasrf/10/909/403.png",
    );
  });
});
