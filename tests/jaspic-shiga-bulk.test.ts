import { describe, expect, it } from "vitest";
import { productionPlan } from "../lib/jaspic/production-plan";
import { fields } from "../supabase/functions/_shared/jaspic/mail";
import type { Item } from "../supabase/functions/_shared/jaspic/collect";

function shiga(id: string, address = "大津市"): Item {
  const data = Object.fromEntries(fields["shiga-person"].map(f => [f, ""]));
  return { kind: "shiga-person", data: { ...data, id, occurrence_dt: "2025-10-01 12:00:00", case_type: "1", address }, context: { cityName: "大津市", stationName: "" } };
}

describe("JASPIC Shiga bulk publication", () => {
  it("accepts 25 genuine changes, then never proposes the unchanged records again", async () => {
    const existing = Array.from({ length: 150 }, (_, n) => shiga(String(n + 1)));
    const records = Object.fromEntries(existing.map(i => [`shiga-person:${i.data.id}`, i.data]));
    const incoming = Array.from({ length: 25 }, (_, n) => shiga(String(151 + n)));
    const snapshot = { revision: 4, baseline: true, records };
    const first = await productionPlan("shiga", snapshot, [...existing, ...incoming], new Set());
    expect(first.candidates).toHaveLength(25);
    expect(first.candidates.every(c => c.key.startsWith("shiga-person:"))).toBe(true);
    const second = await productionPlan("shiga", { ...snapshot, revision: 5, records: first.records }, [...existing, ...incoming], new Set());
    expect(second.candidates).toHaveLength(0);
  });

  it("keeps the complete-source count safety guard for a suspiciously incomplete feed", async () => {
    const existing = Array.from({ length: 150 }, (_, n) => shiga(String(n + 1)));
    const records = Object.fromEntries(existing.map(i => [`shiga-person:${i.data.id}`, i.data]));
    await expect(productionPlan("shiga", { revision: 4, baseline: true, records }, existing.slice(0, 100), new Set()))
      .rejects.toThrow("SOURCE_COUNT_GUARD");
  });
});
