/** Read-only real-JMA 1mm/h proof. No DB, notification, or Bluesky calls. */
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { scanJmaTileAtLeast1mm } from "../lib/weather/rain/lightRainProof";

const tiles = [[13, 5], [14, 5], [13, 6], [14, 6], [13, 7], [14, 7]] as const;
const stamp = (value: string) => Date.UTC(
  Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1,
  Number(value.slice(6, 8)), Number(value.slice(8, 10)), Number(value.slice(10, 12)),
);

async function main() {
  const now = Date.now();
  const frames = (await fetchForecastTargetTimes())
    .filter(frame => stamp(frame.validtime) > now && stamp(frame.validtime) <= now + 30 * 60_000)
    .slice(0, 6);
  if (!frames.length) throw new Error("No fresh forecast frames: cannot claim real-data success");
  const output = [];
  for (const frame of frames) {
    const perTile = await Promise.all(tiles.map(async ([x, y]) => {
      const url = buildJmaRainTileUrl(frame, 4, x, y);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`JMA tile unavailable: ${response.status} z4/${x}/${y} ${frame.validtime}`);
      const scan = scanJmaTileAtLeast1mm(Buffer.from(await response.arrayBuffer()));
      if (scan.unknownPixels) throw new Error(`Unrecognized JMA pixels: ${scan.unknownPixels} z4/${x}/${y} ${frame.validtime}`);
      return { x, y, ...scan };
    }));
    output.push({ basetime: frame.basetime, validtime: frame.validtime, perTile,
      rainPixels: perTile.reduce((sum, tile) => sum + tile.rainPixels, 0),
      belowOnePixels: perTile.reduce((sum, tile) => sum + tile.belowOnePixels, 0) });
  }
  process.stdout.write(JSON.stringify({ mode: "read-only-jma-1mm", checkedAt: new Date().toISOString(),
    threshold: ">=1mm/h", zoom: 4, municipalityResolution: false, publication: false, frames: output }, null, 2) + "\n");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
