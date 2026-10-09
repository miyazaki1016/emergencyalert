import { readFileSync } from "node:fs";
import { replayScheduler, type ServiceProfile } from "./national-rain-scheduler-replay";
import { REPRESENTATIVES } from "./n03-readiness-common";
const reports = readFileSync(process.argv[2], "utf8").trim().split("\n").map(line => JSON.parse(line));
const regional = reports.find(r => r.layout === "regional" && r.globalCap === 2 && r.gapMs === 0);
const national = reports.find(r => r.layout === "national" && r.globalCap === 2);
if (!regional || !national) throw new Error("Missing actual multi-process service calibration");
const profiles: Record<string, ServiceProfile> = {};
for (const code of REPRESENTATIVES) {
  const row = regional.reports.find((r: { codes: string[] }) => r.codes.length === 1 && r.codes[0] === code);
  if (!row?.result.done) throw new Error("Invalid regional service sample");
  profiles[code] = { jobs: row.result.done, elapsedMs: row.elapsedMs, rssMiB: row.processMaxRssMiB };
}
const mixed = { jobs: Math.min(...national.reports.map((r: { result: { done: number } }) => r.result.done)), elapsedMs: Math.max(...national.reports.map((r: { elapsedMs: number }) => r.elapsedMs)), rssMiB: Math.max(...national.reports.map((r: { processMaxRssMiB: number }) => r.processMaxRssMiB)) };
if (!mixed.jobs) throw new Error("Mixed national calibration completed no jobs");
console.log(JSON.stringify({ mode: "SCHEDULER_CALIBRATION", source: "Actual cold separate-process HTTP worker runs with shared uplink", regionalProfiles: profiles, mixedProfile: mixed, calibrationIsProductionCapacity: false }));
for (const total of [48, 384, 1536, 18432]) for (const policy of ["national", "regional", "staggered"] as const) {
  const arrivals = Object.fromEntries(REPRESENTATIVES.map(code => [code, total / 4]));
  console.log(JSON.stringify({ scenarioJobsPerFiveMinutes: total, ...replayScheduler({ policy, profiles, mixed, arrivals, cycles: 12, globalCap: 2, staggerMs: 3000, serviceMultiplier: 1.5 }) }));
}
for (const policy of ["national", "regional", "staggered"] as const) {
  console.log(JSON.stringify({ scenarioJobsPerFiveMinutes: 384, distribution: "75% Hokkaido", ...replayScheduler({ policy, profiles, mixed, arrivals: { "01": 288, "42": 32, "03": 32, "47": 32 }, cycles: 12, globalCap: 2, staggerMs: 3000, serviceMultiplier: 1.5 }) }));
}
