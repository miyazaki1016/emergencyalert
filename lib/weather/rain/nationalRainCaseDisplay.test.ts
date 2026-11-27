import { describe, expect, it } from "vitest";
import {
  caseDetailsExpired, caseLeadMinutes, caseRadarFrames, presentCaseVersions, rainCaseSlug,
  type CaseSlot, type RainCase, type RainCaseVersion,
} from "./nationalRainCaseDisplay";

const tile = { x: 901, y: 400 };
const incident: RainCase = {
  slug: "17384-20261125-2105", municipality_code: "17384", prefecture: "石川県", municipality: "志賀町",
  first_base: "2026-11-25T12:05:00Z", first_valid_time: "2026-11-25T12:10:00Z",
  last_base: "2026-11-25T12:40:00Z", peak_tier: 80, peak_valid_time: "2026-11-25T12:45:00Z",
  status: "forecast", ended_at: null, permanent: true, details_expire_at: null, verification_summary: null,
};

function version(base: string, slots: CaseSlot[], status: RainCaseVersion["detail_state"] = "rain"): RainCaseVersion {
  return { slug: incident.slug, base_time: base, detail_state: status,
    slots, verification: null, peak_tier: slots.find(slot => slot.tier)?.tier ?? null, peak_valid_time: null };
}

describe("rain case display", () => {
  it("keeps the public summary URL, hides short-lived detail at expiry, and calculates lead to the peak valid time", () => {
    expect(rainCaseSlug.test(incident.slug)).toBe(true);
    expect(rainCaseSlug.test("../17384-20261125-2105")).toBe(false);
    const expiry = Date.parse("2026-12-02T13:00:00Z");
    const details = { permanent: false, details_expire_at: new Date(expiry).toISOString() };
    expect(caseDetailsExpired(details, expiry - 1)).toBe(false);
    expect(caseDetailsExpired(details, expiry)).toBe(true);
    expect(caseDetailsExpired({ ...details, permanent: true }, expiry)).toBe(false);
    expect(caseLeadMinutes(incident)).toBe(40);
  });

  it("retains forecast gaps and keeps the latest observed outcome at each valid time", () => {
    const slot: CaseSlot = { validTime: "2026-11-25T12:20:00Z", band: "detail", state: "rain", tier: 30, basetime: "20261125120500", radarTile: tile };
    const first = version(incident.first_base, [slot]);
    const last = version("2026-11-25T12:10:00Z",
      [{ ...slot, tier: null, state: "unknown", basetime: null, radarTile: null }], "unknown");
    first.verification = [{ validTime: slot.validTime, band: "detail", observedTier: 30, result: "match" }];
    last.verification = [{ validTime: slot.validTime, band: "detail", observedTier: null, result: "unknown" }];
    const display = presentCaseVersions([last, first]);
    expect(display.history.map(({ change }) => change)).toEqual(["初出", "未取得を含む"]);
    expect(display.timeline).toEqual(last.slots);
    expect(display.verification).toEqual(last.verification);
    expect(display.pin).toEqual(tile);
  });

  it("replays five compact JMA timestamps and leaves an unavailable frame empty", () => {
    const base = Date.parse(incident.first_base);
    const slots: CaseSlot[] = Array.from({ length: 6 }, (_, i) => ({
      validTime: new Date(base + (i + 1) * 300_000).toISOString(),
      band: "detail", state: i === 1 ? "unknown" : "rain", tier: i === 1 ? null : 30,
      basetime: i === 1 ? null : "20261125120500", radarTile: tile,
      tileCoverage: [{ x: Math.floor(tile.x / 64), y: Math.floor(tile.y / 64), basetime: "20261125120500" }],
    }));
    const result = caseRadarFrames(incident, version(incident.first_base, slots), "detail", base);
    expect(result).toHaveLength(5);
    expect(result[0]).toMatchObject({ basetime: "20261125120500", validTime: "20261125121000", tile });
    expect(result[1]).toMatchObject({ basetime: undefined, validTime: "20261125121500" });
    expect(caseRadarFrames(incident, version(incident.first_base, slots), "extended", base)).toEqual([]);
  });
});
