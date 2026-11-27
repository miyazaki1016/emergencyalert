import { spawn } from "node:child_process";
import { PNG } from "pngjs";
import { forecastRadarSources, type RadarPlaybackFrame } from "./nationalForecastRadar";
import { forecastTime } from "./nationalForecastSnapshot";

const SIDE = 256;
const MAX_BYTES = 8 * 1024 * 1024;
const clock = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function composite(base: Buffer, overlay: Buffer) {
  const map = PNG.sync.read(base);
  const rain = PNG.sync.read(overlay);
  if ([map.width, map.height, rain.width, rain.height].some(size => size !== SIDE)) throw new Error("VIDEO_TILE_SIZE");
  const output = Buffer.alloc(SIDE ** 2 * 3);
  for (let pixel = 0; pixel < SIDE ** 2; pixel++) {
    const weight = rain.data[pixel * 4 + 3] / 255;
    for (let channel = 0; channel < 3; channel++) {
      output[pixel * 3 + channel] = Math.round(map.data[pixel * 4 + channel] * (1 - weight) + rain.data[pixel * 4 + channel] * weight);
    }
  }
  return output;
}

async function encode(frames: Buffer[], labels: string[], signal: AbortSignal) {
  const filters = ["scale=512:512:flags=neighbor", ...labels.map((label, index) =>
    `drawtext=text='${label}':enable='eq(n,${index})':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.8:boxborderw=10:x=16:y=16`),
  "drawtext=text='JMA / GSI':fontcolor=white:fontsize=17:box=1:boxcolor=black@0.7:boxborderw=7:x=16:y=h-th-16"];
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pixel_format", "rgb24",
      "-video_size", "256x256", "-framerate", "1", "-i", "pipe:0", "-vf", filters.join(","),
      "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p", "-an", "-movflags", "frag_keyframe+empty_moov", "-f", "mp4", "pipe:1"],
    { stdio: ["pipe", "pipe", "ignore"], signal });
    const chunks: Buffer[] = [];
    let bytes = 0;
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) child.kill();
      else chunks.push(chunk);
    });
    child.stdin.on("error", reject);
    child.on("error", reject);
    child.on("close", status => {
      if (status === 0 && bytes > 0 && bytes <= MAX_BYTES) resolve(Buffer.concat(chunks));
      else reject(new Error("VIDEO_ENCODER_FAILED"));
    });
    child.stdin.end(Buffer.concat(frames));
  });
}

export async function buildCasePostVideo(frames: RadarPlaybackFrame[], read: (url: string) => Promise<Buffer>, signal: AbortSignal) {
  if (frames.length < 2 || frames.length > 5) throw new Error("VIDEO_FRAME_UNAVAILABLE");
  const images = new Map<string, Promise<Buffer>>();
  const readOnce = (url: string) => {
    const existing = images.get(url);
    if (existing) return existing;
    const pending = read(url);
    images.set(url, pending);
    return pending;
  };
  const resolved = await Promise.all(frames.map(async frame => {
    if (!frame.basetime) return null;
    const sources = forecastRadarSources(frame.basetime, frame.validTime, frame.tile);
    try {
      const [base, rain] = await Promise.all([readOnce(sources.background), readOnce(sources.rain)]);
      return composite(base, rain);
    } catch {
      return null;
    }
  }));
  const available = resolved.filter(Boolean).length;
  if (available < 2) throw new Error("VIDEO_FRAME_UNAVAILABLE");
  const labels = frames.map((frame, i) =>
    clock.format(forecastTime(frame.validTime)).replace(":", "\\:") + " JST" + (resolved[i] ? "" : " / NO DATA"));
  const rgb = resolved.map(frame => frame ?? Buffer.alloc(SIDE ** 2 * 3, 19));
  return { bytes: await encode(rgb, labels, signal), times: frames.map(frame => frame.validTime), available, target: frames[0].tile };
}
