import { describe, expect, it } from "vitest";
import { auditEndingRadarProxy, type RadarAuditRow } from "../lib/weather/rain/auditEndingRadarProxy";
const decision = (target_id: string, candidate = "ENDING_FORECAST"): RadarAuditRow => ({
  target_id, checked_at: "2026-10-19T11:53:00Z", current_status: "RAIN",
  diagnostic: { endingNoticeCandidate: { candidate, ending: { endingTime: "20261019120000" } } },
});
const obs = (
  target_id: string, time: string, status: "RAIN" | "NO_RAIN",
  sourceTime = time,
): RadarAuditRow => ({
  target_id, checked_at: time,
  source_valid_at: sourceTime.replace(/[-:TZ.]/g, "").slice(0, 14),
  current_status: status,
});
describe("ending radar proxy audit (not ground truth)", () => {
  it("counts separate drying and verified lack of recurrence", () => {
    const report = auditEndingRadarProxy([
      decision("a"),
      obs("a", "2026-10-19T12:00:00Z", "NO_RAIN"),
      obs("a", "2026-10-19T12:05:00Z", "NO_RAIN"),
      obs("a", "2026-10-19T12:10:00Z", "NO_RAIN"),
    ]);
    expect(report).toMatchObject({
      evaluated: 1, verifiedDryAtEnding: 1,
      verifiedNoReRainWithinTenMinutes: 1, unknownRecurrence: 0,
    });
  });
  it("detects re-rain, does not let another target's observations fill gaps", () => {
    const report = auditEndingRadarProxy([
      decision("a"), decision("b"),
      obs("a", "2026-10-19T12:00:00Z", "NO_RAIN"),
      obs("a", "2026-10-19T12:05:00Z", "RAIN"),
      obs("b", "2026-10-19T12:05:00Z", "NO_RAIN"),
      obs("b", "2026-10-19T12:10:00Z", "NO_RAIN"),
    ]);
    expect(report).toMatchObject({
      evaluated: 2, reRainWithinTenMinutes: 1,
      unknownAtEnding: 1, unknownRecurrence: 1,
    });
  });
  it("does not count missing or stale radar as dry or successful", () => {
    const report = auditEndingRadarProxy([
      decision("a"),
      obs("a", "2026-10-19T12:04:00Z", "NO_RAIN"),
      obs("a", "2026-10-19T12:12:50Z", "NO_RAIN"),
    ]);
    expect(report).toMatchObject({
      evaluated: 1, verifiedDryAtEnding: 0,
      unknownAtEnding: 1, verifiedNoReRainWithinTenMinutes: 0,
    });
  });
  it("identifies rain persisting at the forecast cessation time", () => {
    expect(auditEndingRadarProxy([
      decision("a"), obs("a", "2026-10-19T12:00:00Z", "RAIN"),
    ])).toMatchObject({ stillRainingAtEnding: 1, reRainWithinTenMinutes: 0, unknownRecurrence: 1 });
  });
  it("rejects a freshly-polled but stale JMA image as verification", () => {
    const result = auditEndingRadarProxy([
      decision("a"),
      obs("a", "2026-10-19T12:00:00Z", "NO_RAIN", "2026-10-19T11:50:00Z"),
      obs("a", "2026-10-19T12:05:00Z", "NO_RAIN", "2026-10-19T11:50:00Z"),
      obs("a", "2026-10-19T12:10:00Z", "NO_RAIN", "2026-10-19T11:50:00Z"),
    ]);
    expect(result).toMatchObject({
      evaluated: 1, verifiedDryAtEnding: 0, unknownAtEnding: 1,
      verifiedNoReRainWithinTenMinutes: 0, unknownRecurrence: 1,
    });
  });
  it("does not use observations with missing source-valid timestamps", () => {
    const missing: RadarAuditRow = {
      target_id: "a", checked_at: "2026-10-19T12:00:00Z",
      current_status: "NO_RAIN",
    };
    expect(auditEndingRadarProxy([decision("a"), missing]).unknownAtEnding).toBe(1);
  });
  it("does not evaluate decisions outside a candidate window", () => {
    expect(auditEndingRadarProxy([decision("a", "TOO_EARLY_FOR_5_TO_10_MINUTE_WINDOW")]).evaluated).toBe(0);
  });
});
