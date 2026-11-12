/** Format one representative future municipality from the complete z10 proof. */
import { readFileSync } from "node:fs";
import { buildForecastPostCandidates } from "../lib/weather/rain/nationalForecastBluesky";
import { forecastTime } from "../lib/weather/rain/nationalForecastSnapshot";

type Proof = {
  mode: string;
  basetime: string;
  prefectures: number;
  thresholdMmPerHour: number;
  frames: {
    validtime: string;
    z10Municipalities: number;
    municipalities: { code: string; prefecture: string; municipality: string }[];
  }[];
};

const filename = process.argv[2];
if (!filename) throw new Error("Usage: tsx scripts/light-rain-bluesky-dry-run.ts <z10-proof.json>");
const proof = JSON.parse(readFileSync(filename, "utf8")) as Proof;
const base = forecastTime(proof.basetime);
const now = Date.now();
if (proof.mode !== "READ_ONLY_Z10_REAL_JMA_N03" || proof.prefectures !== 47 ||
  proof.thresholdMmPerHour !== 1 || !Number.isFinite(base) || base > now || now - base >= 600_000 ||
  proof.frames.length !== 6 || proof.frames.some((frame, i) =>
    forecastTime(frame.validtime) !== base + (i + 1) * 300_000 ||
    frame.z10Municipalities !== frame.municipalities.length ||
    new Set(frame.municipalities.map(area => area.code)).size !== frame.municipalities.length ||
    frame.municipalities.some(area => !/^\d{5}$/.test(area.code) || !area.prefecture || !area.municipality))) {
  throw new Error("Incomplete or stale z10 forecast. Publication candidate refused.");
}

const candidates = buildForecastPostCandidates({
  source: "JMA",
  n03Version: "20260101",
  basetime: proof.basetime,
  frames: proof.frames.filter(frame => forecastTime(frame.validtime) > now).map(frame => ({
    validTime: frame.validtime,
    municipalities: frame.municipalities.map(area => ({ ...area, minimumMmPerHour: 1 as const })),
  })),
});
console.log(JSON.stringify({ mode: "DRY_RUN", basetime: proof.basetime, candidate: candidates[0] ?? null }));
