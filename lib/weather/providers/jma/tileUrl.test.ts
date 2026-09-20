import { describe, expect, it } from "vitest";
import { buildJmaRainTileUrl } from "./tileUrl";

describe("buildJmaRainTileUrl", () => {
  it("builds a hrpns forecast tile path", () => {
    expect(
      buildJmaRainTileUrl(
        { basetime: "20260920090000", validtime: "20260920093000" },
        10,
        909,
        403,
      ),
    ).toBe(
      "https://www.jma.go.jp/bosai/jmatile/data/nowc/20260920090000/none/20260920093000/surf/hrpns/10/909/403.png",
    );
  });
});
