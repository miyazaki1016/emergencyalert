import { fetchEarlyForecastTargetTimes } from "../lib/weather/providers/jma/earlyForecastTargetTimes";
import { latLonToTilePixel } from "../lib/weather/providers/jma/webMercator";

function buildDiagnosticTileUrl(
  target: { basetime: string; validtime: string; member: string },
  zoom: number,
  tileX: number,
  tileY: number,
) {
  return [
    "https://www.jma.go.jp/bosai/jmatile/data/rasrf",
    target.basetime,
    target.member,
    target.validtime,
    "surf",
    "rasrf",
    String(zoom),
    String(tileX),
    `${tileY}.png`,
  ].join("/");
}

async function main() {
  const lat = 35.5494;
  const lon = 139.7798;
  const point = latLonToTilePixel(lat, lon, 10);
  const targets = await fetchEarlyForecastTargetTimes();

  const results = await Promise.all(targets.map(async (target) => {
    const url = buildDiagnosticTileUrl(target, point.zoom, point.tileX, point.tileY);
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
    successCount: results.filter((result) => result.ok).length,
    point,
    results,
  }, null, 2));

  if (results.some((result) => !result.ok)) {
    throw new Error("One or more JMA early rain member-aware tile requests failed");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
