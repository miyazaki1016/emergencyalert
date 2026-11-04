import { expect, test } from "vitest";
import { packForecastEvidence } from "../supabase/functions/_shared/forecastEvidenceCompact.ts";
import { compareStoredForecasts } from "../lib/research/forecastHistoryReplay.ts";

const target="20261102113000";
const frame=(baseTime:string,intensityClass:string|null,status="RAIN")=>({
  baseTime,validTime:target,status,intensityClass,
  rgba: status==="NO_RAIN"?{r:0,g:0,b:0,a:0}:status==="RAIN"?{r:255,g:128,b:0,a:255}:null,
});
const stored=(targetId:string, checkedAt:string, frames:ReturnType<typeof frame>[], expected=frames.length)=>({
  targetId, checkedAt, diagnostic:{forecastEvidenceCompact:packForecastEvidence(frames,expected)},
});
test("replays separate issuances for the same valid time as persistent severe",()=>{
  const rows=[
    stored("A","2026-11-02T11:02:00Z",[frame("20261102110000","30_TO_50")]),
    stored("A","2026-11-02T11:07:00Z",[frame("20261102110500","50_TO_80")]),
  ];
  const outcome=compareStoredForecasts(rows,"A",target,"2026-11-02T11:10:00Z");
  expect(outcome.result).toMatchObject({continuity:"PERSISTENT",priorBaseTime:"20261102110000",latestBaseTime:"20261102110500"});
  expect(outcome.completeSnapshots).toBe(2);
});
test("isolates target and respects checkedAt cutoff; previous non-severe makes NEW",()=>{
  const rows=[
    stored("A","2026-11-02T11:02:00Z",[frame("20261102110000",null,"NO_RAIN")]),
    stored("B","2026-11-02T11:04:00Z",[frame("20261102110300","30_TO_50")]),
    stored("A","2026-11-02T11:07:00Z",[frame("20261102110500","30_TO_50")]),
    stored("A","2026-11-02T11:16:00Z",[frame("20261102111500",null,"NO_RAIN")]),
  ];
  expect(compareStoredForecasts(rows,"A",target,"2026-11-02T11:10:00Z").result.continuity).toBe("NEW");
});
test("missing and unusable snapshots never become dry",()=>{
  const rows=[
    {targetId:"A",checkedAt:"2026-11-02T11:01:00Z",diagnostic:null},
    stored("A","2026-11-02T11:07:00Z",[frame("20261102110500",null,"FETCH_ERROR")]),
  ];
  const result=compareStoredForecasts(rows,"A",target,"2026-11-02T11:10:00Z");
  expect(result.result.continuity).toBe("UNKNOWN");
  expect(result.skippedSnapshots).toBe(1);
});
test("unknown version snapshots are skipped rather than invented as no rain",()=>{
  const rows=[{targetId:"A",checkedAt:"2026-11-02T11:02:00Z",diagnostic:{forecastEvidenceCompact:{schemaVersion:99,frames:[]}}}];
  expect(compareStoredForecasts(rows,"A",target,"2026-11-02T11:10:00Z")).toMatchObject({
    result:{continuity:"UNKNOWN"},usableSnapshots:0,skippedSnapshots:1,
  });
});

test("rejects a forecast issuance timestamp after the recorded poll",()=>{
  const rows=[
    stored("A","2026-11-02T11:02:00Z",[frame("20261102110500","30_TO_50")]),
  ];
  const result=compareStoredForecasts(rows,"A",target,"2026-11-02T11:10:00Z");
  expect(result.result).toMatchObject({continuity:"UNKNOWN",latestBaseTime:null});
});
test("valid forecast issued before its own poll remains comparable",()=>{
  const rows=[
    stored("A","2026-11-02T11:02:00Z",[frame("20261102110000","30_TO_50")]),
    stored("A","2026-11-02T11:07:00Z",[frame("20261102110500","30_TO_50")]),
  ];
  const result=compareStoredForecasts(rows,"A",target,"2026-11-02T11:10:00Z");
  expect(result.result.continuity).toBe("PERSISTENT");
});

test("rejects impossible calendar dates instead of normalizing them",()=>{
  const rows=[stored("A","2026-03-04T11:02:00Z",[{...frame("20260231010000","30_TO_50"),validTime:"20260304113000"}])];
  const result=compareStoredForecasts(rows,"A","20260304113000","2026-03-04T11:10:00Z");
  expect(result.result).toMatchObject({continuity:"UNKNOWN",latestBaseTime:null});
});

test("missing source pixel cannot be treated as confirmed severe rain",()=>{
  const rows=[stored("A","2026-11-02T11:02:00Z",[
    {...frame("20261102110000","30_TO_50"),rgba:null},
  ])];
  const result=compareStoredForecasts(rows,"A",target,"2026-11-02T11:10:00Z");
  expect(result.result).toMatchObject({continuity:"UNKNOWN",latestSevere:false});
});
