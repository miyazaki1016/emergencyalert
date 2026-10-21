import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

describe("offline rain-ending radar audit CLI", () => {
  it("prints explicit candidate counts, source coverage and lead-group results without a Supabase connection", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("scripts/audit-ending-radar.mjs"),
      resolve("tests/fixtures/ending-radar-sample.json"),
    ], { encoding: "utf8" });
    const parsed = JSON.parse(output);
    expect(parsed.rows).toBe(4);
    expect(parsed.candidateRowsPresent).toBe(1);
    expect(parsed.withSourceValidAt).toBe(4);
    expect(parsed.cohorts.lead5ToUnder7Point5).toMatchObject({
      evaluated: 1,
      verifiedDryAtEnding: 1,
      verifiedNoReRainWithinTenMinutes: 1,
      evidenceCoverageFraction: 1,
    });
    expect(parsed.cohorts.lead7Point5To10.evidenceCoverageFraction).toBeNull();
  });
});
