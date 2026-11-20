// Run with tsx: scripts/jma-z4-probe.ts BASETIME VALIDTIME MISSING_X/Y CONTROL_X/Y
import { setTimeout as delay } from "node:timers/promises";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { forecastTime } from "../lib/weather/rain/nationalForecastSnapshot";

async function main() {
  const [basetime, validtime, missing, control] = process.argv.slice(2);
  if (![basetime, validtime].every(value => /^\d{14}$/.test(value)) ||
      ![missing, control].every(value => /^(13|14)\/[567]$/.test(value)) || missing === control) {
    throw new Error("Use one basetime/validtime and two distinct z4 coordinates: missing then control");
  }
  const base = forecastTime(basetime);
  const start = base + 300_000;
  const end = base + 900_000;
  if (Date.now() >= end || base > Date.now()) throw new Error("Select a current forecast cycle");
  let next = Math.max(Date.now(), start);
  while (next < end) {
    await delay(Math.max(0, next - Date.now()));
    if (Date.now() >= end) break;
    await Promise.all([missing, control].map(async (coordinate, index) => {
      const [x, y] = coordinate.split("/").map(Number);
      const url = buildJmaRainTileUrl({ basetime, validtime }, 4, x, y);
      let outcome: string;
      try {
        const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
        outcome = String(response.status);
        await response.body?.cancel();
      } catch (error) {
        outcome = error instanceof Error ? error.name : "transport_error";
      }
      console.log(JSON.stringify({ basetime, validtime, coordinate, role: index ? "control" : "missing", outcome, elapsedFromBaseMs: Date.now() - base }));
    }));
    next += 30_000;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
