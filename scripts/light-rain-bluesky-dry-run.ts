/** Format one representative future municipality from the complete z10 proof. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildForecastPostCandidates } from "../lib/weather/rain/nationalForecastBluesky";
import { deliverLightRainPost, lightRainRecordKey } from "../lib/weather/rain/lightRainBlueskyDelivery";
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
const candidate = candidates[0] ?? null;
const digest = candidate && createHash("sha256")
  .update(JSON.stringify([proof.basetime, candidate.key, candidate.text]))
  .digest("hex");
console.log(JSON.stringify({ mode: "DRY_RUN", basetime: proof.basetime, candidate, digest }));

const issue219Once = process.argv[3] === "--publish-issue-219-once";
if (process.argv[3] === "--publish" || issue219Once) {
  const { BLUESKY_HANDLE, BLUESKY_DID, BLUESKY_APP_PASSWORD, BLUESKY_APPROVED_CANDIDATE } = process.env;
  if (!candidate || digest !== BLUESKY_APPROVED_CANDIDATE ||
    !BLUESKY_HANDLE || !BLUESKY_DID || !BLUESKY_APP_PASSWORD) {
    throw new Error("Exact dry-run candidate and configured Bluesky account are required");
  }
  // Reserve one stable TID for this authorization, even when a rerun uses a different forecast.
  const recordKey = lightRainRecordKey(issue219Once ? Date.UTC(2026, 10, 12, 22, 20) : base);
  deliverLightRainPost(
    { handle: BLUESKY_HANDLE, did: BLUESKY_DID, appPassword: BLUESKY_APP_PASSWORD },
    { text: candidate.text, key: recordKey, validUntil: forecastTime(candidate.validTime) },
  ).then(url => console.log(JSON.stringify({ mode: "PUBLISHED", url, basetime: proof.basetime, candidate }))).catch(error => {
    console.error(error instanceof Error ? error.message : "Bluesky delivery failed");
    process.exitCode = 1;
  });
}
