import { expect, test } from "vitest";
import { extractForecastEvidence } from "../lib/research/forecastEvidence.ts";
const frame = { baseTime: "20261031112500", validTime: "20261031113000", status: "RAIN", intensityClass: "30_TO_50" };
test("healthy API response with null diagnostic retains forecast", () => {
  const result = extractForecastEvidence({ diagnostic: null, forecast: [frame] }, 1);
  expect(result.state).toBe("COMPLETE");
  expect(result.frames[0].intensityClass).toBe("30_TO_50");
});
test("unknown expected count is partial rather than silently complete", () => {
  expect(extractForecastEvidence({ diagnostic: null, forecast: [frame] }).state).toBe("PARTIAL");
});
test("missing forecast is not dry weather", () => {
  expect(extractForecastEvidence({ forecast: [] }, 6)).toMatchObject({ state: "MISSING", reason: "NO_FORECAST_FRAMES" });
});
test("partial frame count is visible", () => {
  expect(extractForecastEvidence({ forecast: [frame] }, 6)).toMatchObject({ state: "PARTIAL", reason: "FRAME_COUNT_MISMATCH" });
});
test("missing time fields are excluded and flagged", () => {
  expect(extractForecastEvidence({ forecast: [{status:"RAIN"}] }, 1)).toMatchObject({ state: "PARTIAL", frames: [], reason: "INCOMPLETE_FRAME_FIELDS" });
});
test("diagnostic expected count is usable for withheld interpretation", () => {
  expect(extractForecastEvidence({ diagnostic: {expectedForecastFrames: 1}, forecast: [frame] }).state).toBe("COMPLETE");
});

test("fetch error is incomplete even when expected count matches", () => {
  expect(extractForecastEvidence({ forecast: [{...frame, status: "FETCH_ERROR"}] }, 1)).toMatchObject({ state: "PARTIAL", reason: "UNUSABLE_FRAME_STATUS" });
});
test("unknown pixel is incomplete even when expected count matches", () => {
  expect(extractForecastEvidence({ forecast: [{...frame, status: "UNKNOWN_PIXEL"}] }, 1)).toMatchObject({ state: "PARTIAL", reason: "UNUSABLE_FRAME_STATUS" });
});
