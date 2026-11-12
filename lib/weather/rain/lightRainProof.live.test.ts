import { describe, expect, it } from "vitest";
import { fetchForecastTargetTimes } from "../providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../providers/jma/tileUrl";
import { scanJmaTileAtLeast1mm } from "./lightRainProof";

/** Opt-in network proof only. CI and production never contact JMA through this test. */
const live = process.env.RUN_JMA_LIGHT_RAIN_LIVE === "1";
const tiles = [[13, 5], [14, 5], [13, 6], [14, 6], [13, 7], [14, 7]] as const;
const toMillis = (value: string) => Date.UTC(
  +value.slice(0, 4), +value.slice(4, 6) - 1, +value.slice(6, 8),
  +value.slice(8, 10), +value.slice(10, 12),
);

describe.skipIf(!live)("real JMA 1mm/h six-frame read-only proof", () => {
  it("scans six fresh five-minute forecasts without skipped or unknown pixels", async () => {
    const now = Date.now();
    const frames = (await fetchForecastTargetTimes())
      .filter(f => toMillis(f.validtime) > now && toMillis(f.validtime) <= now + 30 * 60_000)
      .slice(0, 6);
    expect(frames).toHaveLength(6);
    const results = [];
    for (const frame of frames) {
      const perTile = await Promise.all(tiles.map(async ([x, y]) => {
        const response = await fetch(buildJmaRainTileUrl(frame, 4, x, y), { cache: "no-store" });
        expect(response.ok, `missing JMA tile ${frame.validtime} ${x}/${y}`).toBe(true);
        const scan = scanJmaTileAtLeast1mm(Buffer.from(await response.arrayBuffer()));
        expect(scan.unknownPixels, `unknown JMA colors ${frame.validtime} ${x}/${y}`).toBe(0);
        expect(scan.sampledPixels).toBe(256 * 256);
        return { x, y, rainPixels: scan.rainPixels };
      }));
      results.push({ validtime: frame.validtime, perTile });
    }
    console.info("READ_ONLY_JMA_1MM_PROOF", JSON.stringify({ checkedAt: new Date().toISOString(), results }));
  }, 120_000);
});
