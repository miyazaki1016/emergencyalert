import { describe, expect, it } from "vitest";
import { productionPlan, assertVerifiedBackfillScope } from "../lib/jaspic/production-plan";
import { fields, type RecordData } from "../supabase/functions/_shared/jaspic/mail";
import type { Item } from "../supabase/functions/_shared/jaspic/collect";
import type { Snapshot } from "../supabase/functions/_shared/jaspic/state";

function crime(id: string, date = "2026-11-01 10:00:00", address = "テスト地点"): Item {
  const data: RecordData = Object.fromEntries(fields["hiroshima-crime"].map(field => [field, ""]));
  Object.assign(data, {
    id, occurrence_date_from: date, occurrence_date_to: date,
    case_type: "住居侵入", address, latitude: "34.0", longitude: "132.0",
    city_code: "101", police_station: "1",
  });
  return { kind: "hiroshima-crime", data, context: { cityName: "テスト市", stationName: "テスト警察署" } };
}

function person(id: string): Item {
  const data: RecordData = Object.fromEntries(fields["hiroshima-person"].map(field => [field, ""]));
  Object.assign(data, {
    id, occurrence_dt: "2026-11-01 10:00:00",
    case_type: "声掛け", latitude: "34.0", longitude: "132.0",
    city_code: "101", police_station: "1",
  });
  return { kind: "hiroshima-person", data, context: { cityName: "テスト市", stationName: "テスト警察署" } };
}

function baseline() {
  const existing = [
    ...Array.from({ length: 10 }, (_, n) => crime(String(1126001001 + n))),
    ...Array.from({ length: 10 }, (_, n) => person(String(45701 + n))),
  ];
  const records = Object.fromEntries(existing.map(item => [`${item.kind}:${item.data.id}`, item.data]));
  return { existing, snapshot: { revision: 5, baseline: true, records } satisfies Snapshot };
}

describe("JASPIC historical ID quarantine", () => {
  it("does not send or baseline unseen historical IDs, while planning a safe recent event", async () => {
    const { existing, snapshot } = baseline();
    const historical = crime("1126001011", "2026-10-15 09:00:00");
    const recent = crime("1126001012", "2026-11-08 16:20:00");
    const result = await productionPlan("hiroshima", snapshot, [...existing, historical, recent], new Set());
    expect(result.quarantined).toEqual(["hiroshima-crime:1126001011"]);
    expect(result.candidates.map(c => c.key)).toEqual(["hiroshima-crime:1126001012"]);
    expect(result.records).not.toHaveProperty("hiroshima-crime:1126001011");
    expect(result.records).toHaveProperty("hiroshima-crime:1126001012");

    const second = await productionPlan("hiroshima", { ...snapshot, revision: 6, records: result.records },
      [...existing, historical, recent], new Set());
    expect(second.candidates).toHaveLength(0);
    expect(second.quarantined).toEqual(["hiroshima-crime:1126001011"]);
  });

  it("allows an update to a known ID without releasing an unreconciled historical ID", async () => {
    const { existing, snapshot } = baseline();
    const changed = crime(String(1126001001), "2026-11-01 10:00:00", "更新された場所");
    const historical = crime("1126001011", "2026-10-15 09:00:00");
    const result = await productionPlan("hiroshima", snapshot, [...existing.slice(1), changed, historical], new Set());
    expect(result.candidates.map(c => c.key)).toEqual(["hiroshima-crime:1126001001"]);
    expect(result.quarantined).toEqual(["hiroshima-crime:1126001011"]);
  });

  it("preserves the complete-source count guard", async () => {
    const { existing, snapshot } = baseline();
    await expect(productionPlan("hiroshima", snapshot, [...existing.slice(0, 7), ...existing.slice(10)], new Set()))
      .rejects.toThrow("SOURCE_COUNT_GUARD");
  });
});

describe("bicycle theft exclusion without quarantine", () => {
  it("does not quarantine or notify old/new bicycle theft, but baselines it for future source-count checks", async () => {
    const { existing, snapshot } = baseline();
    const oldBicycle = crime("1126001071", "2026-08-15 12:00:00");
    const newBicycle = crime("1126001072", "2026-11-09 12:00:00");
    oldBicycle.data.case_type = "自転車盗";
    newBicycle.data.case_type = "自転車盗";
    const result = await productionPlan("hiroshima", snapshot, [...existing, oldBicycle, newBicycle], new Set());
    expect(result.quarantined).toEqual([]);
    expect(result.candidates).toEqual([]);
    expect(result.records).toHaveProperty("hiroshima-crime:1126001071");
    expect(result.records).toHaveProperty("hiroshima-crime:1126001072");
    const rerun = await productionPlan("hiroshima", { ...snapshot, records: result.records }, [...existing, oldBicycle, newBicycle], new Set());
    expect(rerun.quarantined).toEqual([]);
    expect(rerun.candidates).toEqual([]);
  });
});

describe("verified legacy JSON catch-up", () => {
  const personIds = ["45811", "45815", "45823"];
  const crimeIds = ["1126015070", "1126055048", "1126155046", "1126175061", "1126185011", "1126195022"];
  it("plans exactly the nine operator-verified missing records, retaining other historical IDs in quarantine", async () => {
    const {existing,snapshot}=baseline();
    // Maintain the source-count guard with a representative large baseline.
    const extra=[...Array.from({length:40},(_,n)=>crime(String(1126002001+n))),...Array.from({length:40},(_,n)=>person(String(45601+n)))];
    existing.push(...extra);
    Object.assign(snapshot.records,Object.fromEntries(extra.map(item=>[`${item.kind}:${item.data.id}`,item.data])));
    const catchup=[...personIds.map(id=>person(id)),...crimeIds.map(id=>crime(id))];
    const unrelated=crime("1126001999");
    const result=await productionPlan("hiroshima",snapshot,[...existing,...catchup,unrelated],new Set());
    expect(result.verifiedPending).toHaveLength(9);
    expect(new Set(result.candidates.map(c=>c.key))).toEqual(new Set(result.verifiedPending));
    expect(result.quarantined).toContain("hiroshima-crime:1126001999");
    expect(result.records).not.toHaveProperty("hiroshima-crime:1126001999");
    expect(()=>assertVerifiedBackfillScope([{province:"hiroshima",result}])).not.toThrow();
    expect(()=>assertVerifiedBackfillScope([{province:"hiroshima",result:{...result,candidates:[...result.candidates,{...result.candidates[0],key:"unexpected"}]}}])).toThrow("VERIFIED_BACKFILL_SCOPE_MISMATCH");
    const after={...snapshot,records:result.records};
    const repeated=await productionPlan("hiroshima",after,[...existing,...catchup,unrelated],new Set());
    expect(repeated.verifiedPending).toHaveLength(0);
    expect(repeated.candidates).toHaveLength(0);
  });
});
