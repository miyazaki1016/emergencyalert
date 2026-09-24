import { JmaEarlyRainForecastProvider } from "../lib/weather/providers/jma/JmaEarlyRainForecastProvider";

const lat = 35.5494;
const lon = 139.7798;

const provider = new JmaEarlyRainForecastProvider();
const frames = await provider.getForecastFrames(lat, lon);
const usable = frames.filter((frame) => frame.status !== "FETCH_ERROR");

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  frameCount: frames.length,
  usableCount: usable.length,
  firstFrame: frames[0] ?? null,
  firstRain: frames.find((frame) => frame.status === "RAIN") ?? null,
}, null, 2));

if (frames.length === 0 || usable.length === 0) {
  throw new Error("JMA early rain live smoke test returned no usable forecast frames");
}
