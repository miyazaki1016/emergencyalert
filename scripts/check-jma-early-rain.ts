import { fetchEarlyForecastTargetTimes } from "../lib/weather/providers/jma/earlyForecastTargetTimes";
import { latLonToTilePixel } from "../lib/weather/providers/jma/webMercator";

function buildTileUrl(
  target: { basetime: string; validtime: string },
  member: string,
  zoom: number,
  tileX: number,
  tileY: number,
) {
  return [
    "https://www.jma.go.jp/bosai/jmatile/data/rasrf",
    target.basetime,
    member,
    target.validtime,
    "surf",
    "rasrf",
    String(zoom),
    String(tileX),
    `${tileY}.png`,
  ].join("/");
}

async function probe(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const contentType = response.headers.get("content-type");
    const bytes = response.ok ? (await response.arrayBuffer()).byteLength : 0;
    return { status: response.status, contentType, bytes, ok: response.ok };
  } catch (error) {
    return {
      status: null,
      contentType: null,
      bytes: 0,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const lat = 35.5494;
  const lon = 139.7798;
  const point = latLonToTilePixel(lat, lon, 10);
  const targets = await fetchEarlyForecastTargetTimes();

  const results = await Promise.all(targets.map(async (target) => {
    const declared = await probe(buildTileUrl(target, target.member, point.zoom, point.tileX, point.tileY));
    const none = target.member === "none"
      ? declared
      : await probe(buildTileUrl(target, "none", point.zoom, point.tileX, point.tileY));
    const immed = target.member === "immed"
      ? declared
      : await probe(buildTileUrl(target, "immed", point.zoom, point.tileX, point.tileY));

    return {
      baseTime: target.basetime,
      validTime: target.validtime,
      declaredMember: target.member,
      declared,
      none,
      immed,
    };
  }));

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    targetCount: targets.length,
    declaredSuccessCount: results.filter((result) => result.declared.ok).length,
    immedTargetCount: results.filter((result) => result.declaredMember === "immed").length,
    point,
    results,
  }, null, 2));

  if (results.some((result) => !result.declared.ok)) {
    throw new Error("One or more JMA declared-member tile requests failed");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
