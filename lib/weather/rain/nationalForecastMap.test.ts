import { describe, expect, it } from "vitest";
import { forecastMapSelection } from "./nationalForecastMap";
import { forecastMarkersOverlap, forecastMarkerZIndex, missingLandOverlay } from "./nationalForecastMapOverlay";
import { forecastTime, type NationalForecastFrame, type NationalForecastSnapshot } from "./nationalForecastSnapshot";

const base = "20261125090000";
const municipality = (code: string, minimumMmPerHour: 30 | 50 | 80) => ({
  code, municipality: code, prefecture: "石川県", minimumMmPerHour, basetime: base,
});
function frame(minute: number, ...municipalities: NationalForecastFrame["municipalities"]): NationalForecastFrame {
  return { validTime: new Date(forecastTime(base) + minute * 60_000).toISOString(), municipalities };
}
function snapshot(frames: NationalForecastFrame[], extendedFrames?: NationalForecastFrame[]): NationalForecastSnapshot {
  return { source: "JMA", n03Version: "20260101", basetime: base, tileVersions: true, frames, extendedFrames };
}

describe("national forecast map", () => {
  it("aggregates both bands, with the same coverage and maximum as the list heading", () => {
    const detail = Array.from({ length: 6 }, (_, i) => frame((i + 1) * 5, municipality("shared", 30), municipality("detail", 50)));
    const extended = Array.from({ length: 11 }, (_, i) => frame(35 + i * 5, municipality("extended", 50)));
    extended[2].municipalities.push(municipality("shared", 80));
    const forecast = snapshot(detail, extended);
    const allAreas = [...detail, ...extended].flatMap(item => item.municipalities);
    const { frame: combined, peaks } = forecastMapSelection(forecast, "all", null);
    expect(combined?.municipalities).toHaveLength(new Set(allAreas.map(area => area.code)).size);
    expect(peaks.get("shared")).toEqual({ area: municipality("shared", 80), time: extended[2].validTime });
    expect(Math.max(...combined!.municipalities.map(area => area.minimumMmPerHour)))
      .toBe(Math.max(...allAreas.map(area => area.minimumMmPerHour)));
    expect(forecastMapSelection(forecast, "detail", null).peaks.has("extended")).toBe(false);
    expect(forecastMapSelection(forecast, "extended", null).peaks.has("detail")).toBe(false);
    expect(forecastMapSelection(forecast, "all", forecastTime(detail[0].validTime)).peaks.has("extended")).toBe(false);
    expect(forecastMapSelection(forecast, "all", null).peaks.size).toBe(3);
  });

  it("marks only interior gaps and makes a missing time selectable", () => {
    const forecast = snapshot([frame(10), frame(20)], [frame(35), frame(40)]);
    const detail = forecastMapSelection(forecast, "detail", null);
    expect(detail.slots.map(slot => slot.missing)).toEqual([false, true, false]);
    expect(forecastMapSelection(forecast, "extended", null).slots.map(slot => slot.missing)).toEqual([false, false]);
    const selected = forecastMapSelection(forecast, "detail", detail.slots[1].time);
    expect(selected).toMatchObject({ activeTime: detail.slots[1].time, hasCoverage: false });
    expect(selected.frame).toBeUndefined();
    expect(forecastMapSelection(forecast, "detail", detail.slots[2].time).frame?.incomplete).toBe(false);
    expect(forecastMapSelection(snapshot([frame(10), frame(15)]), "all", null).frame?.incomplete).toBe(false);
  });

  it("hatches only tiles without a completed version in the selection", () => {
    const unavailable = { x: 14, y: 6 };
    const other = { x: 13, y: 6 };
    const forecast = snapshot([
      { ...frame(5), tileCoverage: [unavailable, other], incomplete: true },
      { ...frame(10), tileCoverage: [{ ...unavailable, basetime: base }, other], incomplete: true },
    ]);
    expect(forecastMapSelection(forecast, "all", null).frame?.tileCoverage?.filter(tile => !tile.basetime)).toEqual([other]);
    const first = forecastMapSelection(forecast, "all", forecastTime(forecast.frames[0].validTime));
    expect(first.frame?.tileCoverage).toEqual([unavailable, other]);
    expect(first.hasCoverage).toBe(false);
  });

  it("shows a fallback with municipalities but without invented tile coverage or gaps", () => {
    const fallback = { ...snapshot([frame(5, municipality("fallback", 30)), frame(15)]), tileVersions: undefined };
    const result = forecastMapSelection(fallback, "all", null);
    expect(result.hasCoverage).toBe(true);
    expect(result.frame?.municipalities).toEqual([municipality("fallback", 30)]);
    expect(result.frame?.tileCoverage).toBeUndefined();
    expect(result.slots.map(slot => slot.missing)).toEqual([false, false]);
  });
});

describe("national forecast map layers", () => {
  it("aligns the ocean-transparent polygon hatch to the missing tile", () => {
    const overlay = missingLandOverlay(14, 6);
    expect(overlay.southwest).toEqual([3584, 1792]);
    expect(overlay.northeast).toEqual([3840, 1536]);
    const svg = decodeURIComponent(overlay.url.split(",")[1]);
    expect(svg).toContain('viewBox="3584 1536 256 256"');
    expect(svg).toMatch(/<path d="M[\d.]+ [\d.]+L[^"]+Z" fill="url\(#missing\)" fill-rule="evenodd"/);
    expect(svg).not.toContain("<rect");
  });

  it("puts stronger markers in front and identifies nearby markers across tile groups", () => {
    expect(forecastMarkerZIndex(80)).toBeGreaterThan(forecastMarkerZIndex(50));
    expect(forecastMarkerZIndex(50)).toBeGreaterThan(forecastMarkerZIndex(30));
    const origin = { x: 100, y: 100 };
    expect(forecastMarkersOverlap(origin, { x: 110, y: 125 })).toBe(true);
    expect(forecastMarkersOverlap(origin, { x: 110, y: 132 })).toBe(false);
  });
});
