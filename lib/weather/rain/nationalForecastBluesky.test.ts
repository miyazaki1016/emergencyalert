import { describe, expect, it } from "vitest";
import { buildForecastPostCandidates, significantForecastChanges } from "./nationalForecastBluesky";
import type { NationalForecastSnapshot } from "./nationalForecastSnapshot";
const snapshot = (areas: Array<{code:string;minimumMmPerHour:30|50|80}>): NationalForecastSnapshot => ({
 source:"JMA",n03Version:"20260101",basetime:"20261112120000",
 frames:[{validTime:"20261112120500",municipalities:areas.map(a=>({...a,prefecture:"東京都",municipality:a.code==="13108"?"江東区":"中央区"}))}]
});
describe("national forecast Bluesky candidate",()=>{
 it("uses the same municipality labels and intensity as the top forecast",()=>{
  const rows=buildForecastPostCandidates(snapshot([{code:"13108",minimumMmPerHour:50}]));
  expect(rows[0].text).toContain("東京都 江東区");
  expect(rows[0].text).toContain("50mm");
 });
 it("does not announce identical or weaker forecasts",()=>{
  const old=snapshot([{code:"13108",minimumMmPerHour:50}]);
  expect(significantForecastChanges(old,old)).toEqual([]);
  expect(significantForecastChanges(snapshot([{code:"13108",minimumMmPerHour:30}]),old)).toEqual([]);
 });
 it("announces new areas and stronger rainfall",()=>{
  const old=snapshot([{code:"13108",minimumMmPerHour:30}]);
  expect(significantForecastChanges(snapshot([{code:"13108",minimumMmPerHour:80},{code:"13102",minimumMmPerHour:50}]),old)).toHaveLength(2);
 });
 it("requires a previous valid snapshot rather than treating startup as an alert",()=>{
  expect(significantForecastChanges(snapshot([{code:"13108",minimumMmPerHour:80}]),null)).toEqual([]);
 });
 it("produces stable dedupe keys",()=>{
  const a=snapshot([{code:"13108",minimumMmPerHour:50}]);
  expect(buildForecastPostCandidates(a)[0].key).toBe(buildForecastPostCandidates(a)[0].key);
 });
});
