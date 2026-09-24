import { fetchEarlyForecastTargetTimes } from "../lib/weather/providers/jma/earlyForecastTargetTimes";
import { buildJmaEarlyForecastTileUrl } from "../lib/weather/providers/jma/earlyForecastTileUrl";
import { latLonToTilePixel } from "../lib/weather/providers/jma/webMercator";

async function main() {
  const lat = 35.5494;
  const lon = 139.7798;
  const point = latLonToTilePixel(lat, lon, 10);
  const targets = await fetchEarlyForecastTargetTimes();

  const results = await Promise.all(targets.map(async (target) => {
    const url = buildJmaEarlyForecastTileUrl(target, point.zoom, point.tileX, point.tileY);
    try {
      const response = await fetch(url, { cache: "no-store" });
      const contentType = response.headers.get("content-type");
      const bytes = response.ok ? (await response.arrayBuffer()).byteLength : 0;
      return {
        baseTime: target.basetime,
        validTime: target.validtime,
        member: target.member,
        httpStatus: response.status,
        contentType,
        bytes,
        ok: response.ok,
      };
    } catch (error) {
      return {
        baseTime: target.basetime,
        validTime: target.validtime,
        member: target.member,
        httpStatus: null,
        contentType: null,
        bytes: 0,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }));

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    targetCount: targets.length,
    point,
    results,
  }, null, 2));

  if (results.every((result) => !result.ok)) {
    throw new Error("JMA early rain diagnostic returned no successful tile responses");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
