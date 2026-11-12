import { randomUUID } from "node:crypto";
import { access, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchForecastTargetTimes, type JmaTargetTime } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { heavyRainAreaPolygons, scanHeavyRainTile } from "../lib/weather/rain/nationalHeavyRain";
import { N03_DATASET_DATE } from "../lib/weather/rain/n03Dataset";
import { N03_PREFECTURE_INDEX_2026 } from "../lib/weather/rain/n03PrefectureIndex2026";
import { resolveNationalRainMunicipalities } from "../lib/weather/rain/nationalRainMunicipalityResolver";
import { stagedRefinementJobsFromCoarseCandidates } from "../lib/weather/rain/nationalRainQueue";
import { readNationalForecastSnapshot } from "../lib/weather/rain/nationalForecastSnapshot";
import { localPreparedLoader } from "./national-rain-proof-n03";

const japanTiles = [[13, 5], [14, 5], [13, 6], [14, 6], [13, 7], [14, 7]] as const;
const thresholds = [
  { level: "TORRENTIAL", minimumMmPerHour: 80 },
  { level: "VERY_HEAVY", minimumMmPerHour: 50 },
  { level: "HEAVY", minimumMmPerHour: 30 },
] as const;

function jmaTimestamp(time: number) {
  return new Date(time).toISOString().slice(0, 19).replace(/\D/g, "");
}

async function scanForecast(frame: JmaTargetTime, load: ReturnType<typeof localPreparedLoader>["load"]) {
  const signal = AbortSignal.timeout(60_000);
  async function fetchTile(zoom: number, x: number, y: number) {
    const response = await fetch(buildJmaRainTileUrl(frame, zoom, x, y), { signal });
    if (!response.ok) throw new Error(`JMA tile unavailable: ${frame.validtime} z${zoom}/${x}/${y} (${response.status})`);
    return Buffer.from(await response.arrayBuffer());
  }

  const coarse = (await Promise.all(japanTiles.map(async ([x, y]) =>
    scanHeavyRainTile(await fetchTile(4, x, y), 4, x, y, 1),
  ))).flat();

  // A full scan of each selected detail tile covers all candidate windows at
  // once. Refine directly from z4 so intermediate levels cannot drop a window.
  const tiles = new Map(stagedRefinementJobsFromCoarseCandidates(coarse, frame, 10).map(job =>
    [`${job.tileX}:${job.tileY}`, job],
  ));
  const municipalities = new Map<string, {
    code: string;
    prefecture: string;
    municipality: string;
    minimumMmPerHour: 30 | 50 | 80;
  }>();
  for (const { tileX, tileY } of tiles.values()) {
    const candidates = scanHeavyRainTile(await fetchTile(10, tileX, tileY), 10, tileX, tileY, 1);
    for (const { level, minimumMmPerHour } of thresholds) {
      const footprint = heavyRainAreaPolygons(candidates.filter(candidate => candidate.level === level), 10);
      const areas = await resolveNationalRainMunicipalities(footprint, load, undefined, signal);
      for (const area of areas) {
        if ((municipalities.get(area.code)?.minimumMmPerHour ?? 0) < minimumMmPerHour) {
          municipalities.set(area.code, { ...area, minimumMmPerHour });
        }
      }
    }
  }

  return [...municipalities.values()].sort((a, b) => a.code.localeCompare(b.code));
}

async function main() {
  const directory = process.argv[2];
  if (!directory) throw new Error("Usage: tsx scripts/national-rain-fixed-n03.ts <prepared N03 directory>");
  await Promise.all(N03_PREFECTURE_INDEX_2026.map(({ code }) => access(join(directory, `${code}.areas.json`))));
  const { load } = localPreparedLoader(directory);

  const forecasts = await fetchForecastTargetTimes((input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
  );
  const now = Date.now();
  const start = jmaTimestamp(now);
  const end = jmaTimestamp(now + 30 * 60_000);
  const basetime = forecasts.map(frame => frame.basetime).sort().at(-1);
  const frames = forecasts.filter(frame =>
    frame.basetime === basetime && frame.validtime > start && frame.validtime <= end,
  );
  const expectedTimes = Array.from({ length: 6 }, (_, index) =>
    jmaTimestamp((Math.floor(now / 300_000) + index + 1) * 300_000),
  );
  if (frames.map(frame => frame.validtime).join(",") !== expectedTimes.join(",")) {
    throw new Error("Complete JMA forecast coverage for the next 30 minutes is unavailable");
  }

  const results = [];
  for (const frame of frames) {
    results.push({ validTime: frame.validtime, municipalities: await scanForecast(frame, load) });
  }
  if (results[0].validTime <= jmaTimestamp(Date.now())) throw new Error("Forecast expired during the scan");
  const snapshot = { source: "JMA", n03Version: N03_DATASET_DATE, basetime, frames: results };
  readNationalForecastSnapshot(snapshot);
  const json = JSON.stringify(snapshot, null, 2);
  const output = process.env.NATIONAL_RAIN_SNAPSHOT_PATH;
  if (!output) {
    console.log(json);
    return;
  }

  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, json, { flag: "wx" });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
