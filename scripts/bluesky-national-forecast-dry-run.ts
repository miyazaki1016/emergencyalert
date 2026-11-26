import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { planTileForecastPublication } from "../lib/weather/rain/nationalForecastBlueskyTiles";
import type { NationalForecastSnapshot } from "../lib/weather/rain/nationalForecastSnapshot";
import type { ForecastTileVersion } from "../lib/weather/rain/nationalForecastTiles";

// Single-process file replay. Use one new baseline path per episode and pass
// exports captured at each observation time, in chronological order.
const [input, instant, baseline] = process.argv.slice(2);
const now = Date.parse(instant);
if (!input || !baseline || input === baseline || !Number.isFinite(now)) {
  throw new Error("Usage: tsx scripts/bluesky-national-forecast-dry-run.ts <rows.json> <ISO observation time> <baseline.json>");
}
const rows: ForecastTileVersion[] = JSON.parse(readFileSync(input, "utf8"));
let previous: NationalForecastSnapshot | null = null;
try {
  previous = JSON.parse(readFileSync(baseline, "utf8"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const plan = planTileForecastPublication(rows, previous, now);
if (plan) {
  const temporary = `${baseline}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(plan.nextSnapshot), { flag: "wx" });
  renameSync(temporary, baseline);
}
console.log(JSON.stringify({ observationTime: instant, accepted: Boolean(plan), candidates: plan?.candidates ?? [] }, null, 2));
