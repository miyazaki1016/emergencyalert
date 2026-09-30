import { expect, test } from "vitest";
import { replayScheduler } from "./national-rain-scheduler-replay";
const profiles = { a: { jobs: 10, elapsedMs: 10000, rssMiB: 100 }, b: { jobs: 10, elapsedMs: 10000, rssMiB: 100 } };
test("all dispatch policies preserve jobs and drain a measured bounded scenario", () => {
  for (const policy of ["national", "regional", "staggered"] as const) {
    const result = replayScheduler({ policy, profiles, mixed: profiles.a, arrivals: { a: 20, b: 20 }, cycles: 12, globalCap: 2 });
    expect(result.processed).toBe(480); expect(result.remaining).toBe(0);
    expect(result.rows.every(row => row.submitted === row.processed + row.remaining)).toBe(true);
    expect(result.summedWorkerPeakRssMiB).toBeLessThanOrEqual(200);
  }
});
test("overload is retained and oldest age grows rather than dropping jobs", () => {
  const result = replayScheduler({ policy: "staggered", profiles, mixed: profiles.a, arrivals: { a: 400, b: 400 }, cycles: 12, globalCap: 1 });
  expect(result.remaining).toBeGreaterThan(0);
  expect(result.rows.at(-1)!.oldestAgeSeconds).toBeGreaterThan(300);
  expect(result.submitted).toBe(result.processed + result.remaining);
});
test("the twelve-frame theoretical arrival scenario does not overflow argument limits", () => {
  const result = replayScheduler({ policy: "national", profiles, mixed: profiles.a, arrivals: { a: 9216, b: 9216 }, cycles: 12, globalCap: 1 });
  expect(result.submitted).toBe(221184); expect(result.remaining).toBeGreaterThan(200000);
});
