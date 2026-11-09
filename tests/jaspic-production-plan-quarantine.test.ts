import { describe, expect, it } from "vitest";
import { productionPlan } from "../lib/jaspic/production-plan";
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
