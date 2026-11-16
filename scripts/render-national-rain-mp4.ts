import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { PNG } from "pngjs";
import { forecastRadarSources } from "../lib/weather/rain/nationalForecastRadar";
import { forecastTime, readNationalForecastSnapshot } from "../lib/weather/rain/nationalForecastSnapshot";

const jst = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const secondsPerFrame = 1.1;

async function loadTile(url: string) {
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("Forecast video image unavailable: " + response.status);
  const tile = PNG.sync.read(Buffer.from(await response.arrayBuffer()));
  if (tile.width !== 256 || tile.height !== 256) throw new Error("Unexpected forecast video image size");
  return tile;
}

async function main() {
  const [input, municipality, band, output] = process.argv.slice(2);
  if (!input || !/^\d{5}$/.test(municipality ?? "") || (band !== "250m" && band !== "1km") || !output?.endsWith(".mp4")) {
    throw new Error("Usage: render-national-rain-mp4 <snapshot.json> <municipality-code> <250m|1km> <output.mp4>");
  }
  const snapshot = readNationalForecastSnapshot(JSON.parse(await readFile(input, "utf8")));
  const frames = band === "1km" ? snapshot.extendedFrames : snapshot.frames;
  if (!frames || frames.length < 2) throw new Error("Forecast band is unavailable");
  const peak = frames.flatMap(frame => frame.municipalities.filter(area => area.code === municipality))
    .sort((a, b) => b.minimumMmPerHour - a.minimumMmPerHour)[0];
  if (!peak?.radarTile) throw new Error("Municipality has no radar viewport in this band");

  const sources = frames.map(frame => forecastRadarSources(snapshot.basetime, frame.validTime, peak.radarTile!));
  const map = await loadTile(sources[0].background);
  const scratch = await mkdtemp(join(tmpdir(), "national-rain-video-"));
  try {
    for (const [index, source] of sources.entries()) {
      const rain = await loadTile(source.rain);
      const composite = new PNG({ width: 256, height: 256 });
      for (let i = 0; i < composite.data.length; i += 4) {
        const alpha = rain.data[i + 3] / 255;
        for (let channel = 0; channel < 3; channel++) {
          composite.data[i + channel] = Math.round(rain.data[i + channel] * alpha + map.data[i + channel] * (1 - alpha));
        }
        composite.data[i + 3] = 255;
      }
      await writeFile(join(scratch, `frame-${index}.png`), PNG.sync.write(composite));
      await writeFile(join(scratch, `time-${index}.txt`),
        jst.format(forecastTime(frames[index].validTime)) + " JST");
    }
    const labels = sources.map((_, index) => "drawtext=textfile=time-" + index
      + ".txt:fontcolor=white:fontsize=24:box=1:boxcolor=black@0.75:boxborderw=6:x=w-tw-16:y=16"
      + `:enable='gte(t,${index * secondsPerFrame})*lt(t,${(index + 1) * secondsPerFrame})'`);
    const credit = "drawtext=text='Rain forecast / JMA   Map / GSI Japan':fontcolor=white:fontsize=16"
      + ":box=1:boxcolor=black@0.75:boxborderw=5:x=w-tw-12:y=h-th-12";
    execFileSync("ffmpeg", [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
      "-framerate", String(1 / secondsPerFrame), "-i", "frame-%d.png",
      "-vf", [`scale=512:512:flags=${band === "1km" ? "neighbor" : "bilinear"}`, "fps=20", ...labels, credit].join(","),
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", resolve(output),
    ], { cwd: scratch, timeout: 60_000, stdio: ["ignore", "ignore", "pipe"] });
    console.log("Wrote " + basename(output));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Forecast video failed");
  process.exitCode = 1;
});
