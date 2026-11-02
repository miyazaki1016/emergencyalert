import { expect, test } from "vitest";
import { analyzeSevereConsistency } from "../lib/research/severeRainConsistency.ts";
const frame = (baseTime: string, validTime: string, intensityClass: string | null, status = "RAIN") => ({ baseTime, validTime, status, intensityClass });
const target = "20261031115500", asOf = "20261031114000";
test("one issuance cannot establish persistence", () => {
  const r = analyzeSevereConsistency([{ frames: [frame("20261031113500", target, "30_TO_50")] }], target, asOf);
  expect(r.continuity).toBe("UNKNOWN");
  expect(r.priorSevere).toBe(null);
});
test("two issuances with same severe target are persistent", () => {
  const r = analyzeSevereConsistency([{ frames: [frame("20261031113000", target, "30_TO_50")] }, { frames: [frame("20261031113500", target, "30_TO_50")] }], target, asOf);
  expect(r.continuity).toBe("PERSISTENT");
});
test("new severe target after nonsevere prior is new", () => {
  const r = analyzeSevereConsistency([{ frames: [frame("20261031113000", target, "5_TO_10")] }, { frames: [frame("20261031113500", target, "30_TO_50")] }], target, asOf);
  expect(r.continuity).toBe("NEW");
});
test("missing prior target stays unknown, never classified as new", () => {
  const r = analyzeSevereConsistency([{ frames: [frame("20261031113000", "20261031115000", "5_TO_10")] }, { frames: [frame("20261031113500", target, "30_TO_50")] }], target, asOf);
  expect(r.continuity).toBe("UNKNOWN");
});
test("future issuance excluded and no severe current is absent", () => {
  const r = analyzeSevereConsistency([{ frames: [frame("20261031113500", target, "5_TO_10")] }, { frames: [frame("20261031114500", target, "30_TO_50")] }], target, asOf);
  expect(r.continuity).toBe("ABSENT");
});
test("unknown pixel status is not counted as dry", () => {
  const r = analyzeSevereConsistency([{ frames: [frame("20261031113000", target, null, "UNKNOWN")] }, { frames: [frame("20261031113500", target, "30_TO_50")] }], target, asOf);
  expect(r.continuity).toBe("UNKNOWN");
});

test("identical repeat polls do not manufacture an additional issuance", () => {
  const repeated=frame("20261031113500",target,"30_TO_50");
  const r=analyzeSevereConsistency([{frames:[repeated]},{frames:[repeated]}],target,asOf);
  expect(r.continuity).toBe("UNKNOWN");
  expect(r.priorBaseTime).toBe(null);
});
test("conflicting repeat frames from the same issuance are unknown",()=>{
  const r=analyzeSevereConsistency([
    {frames:[frame("20261031113000",target,"5_TO_10")]},
    {frames:[frame("20261031113500",target,"30_TO_50")]},
    {frames:[frame("20261031113500",target,null,"NO_RAIN")]},
  ],target,asOf);
  expect(r.continuity).toBe("UNKNOWN");
  expect(r.latestSevere).toBe(false);
});
test("conflicting prior issuance cannot establish newly severe rain",()=>{
  const r=analyzeSevereConsistency([
    {frames:[frame("20261031113000",target,"30_TO_50"),frame("20261031113000",target,"5_TO_10")]},
    {frames:[frame("20261031113500",target,"30_TO_50")]},
  ],target,asOf);
  expect(r.continuity).toBe("UNKNOWN");
  expect(r.priorSevere).toBe(null);
});
test("missing intensity of rainy frame is unknown rather than dry",()=>{
  const r=analyzeSevereConsistency([
    {frames:[frame("20261031113000",target,"5_TO_10")]},
    {frames:[frame("20261031113500",target,null)]},
  ],target,asOf);
  expect(r.continuity).toBe("UNKNOWN");
});
