import { describe, expect, it } from "vitest";
import { buildForecastPostCandidates, significantForecastChanges, planForecastPublication } from "./nationalForecastBluesky";
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
 it("chooses the strongest forecast within a municipality across the rolling 30 minutes",()=>{
  const data=snapshot([{code:"13108",minimumMmPerHour:30}]);
  data.frames.push({validTime:"20261112121000",municipalities:[{code:"13108",prefecture:"東京都",municipality:"江東区",minimumMmPerHour:50}]});
  const rows=buildForecastPostCandidates(data);
  expect(rows).toHaveLength(1);
  expect(rows[0].intensity).toBe(50);
  expect(rows[0].validTime).toBe("20261112121000");
 });
 it("does not repost when only the forecast time rolls forward by five minutes",()=>{
  const previous=snapshot([{code:"13108",minimumMmPerHour:50}]);
  const current=snapshot([{code:"13108",minimumMmPerHour:50}]);
  current.basetime="20261112120500";
  current.frames[0].validTime="20261112121000";
  expect(significantForecastChanges(current,previous)).toEqual([]);
 });
 it("announces a municipality when rain returns after falling below threshold",()=>{
  const clear=snapshot([]);
  const returned=snapshot([{code:"13108",minimumMmPerHour:50}]);
  expect(significantForecastChanges(returned,clear)).toHaveLength(1);
 });

 it("does not process a repeated or out-of-order baseline",()=>{
  const previous=snapshot([{code:"13108",minimumMmPerHour:30}]);
  const repeated=snapshot([{code:"13108",minimumMmPerHour:80}]);
  expect(planForecastPublication(repeated,previous)).toBeNull();
  repeated.basetime="20261112115500";
  expect(planForecastPublication(repeated,previous)).toBeNull();
 });
 it("advances a newer baseline even when there is no meaningful change",()=>{
  const previous=snapshot([{code:"13108",minimumMmPerHour:50}]);
  const current=snapshot([{code:"13108",minimumMmPerHour:50}]);
  current.basetime="20261112120500";
  current.frames[0].validTime="20261112121000";
  const plan=planForecastPublication(current,previous);
  expect(plan?.candidates).toEqual([]);
  expect(plan?.nextSnapshot).toBe(current);
 });

});
