import { describe, expect, it, vi } from "vitest";

vi.mock("../supabase/functions/_shared/jaspic/state", () => ({
  plan: vi.fn(async () => ({ candidates: [], quarantined: [], expectedRevision: 4 })),
}));
import { productionPlan } from "../lib/jaspic/production-plan";
import { fields } from "../supabase/functions/_shared/jaspic/mail";
import { plan } from "../supabase/functions/_shared/jaspic/state";

const make = (kind: "shiga-person" | "hiroshima-person" | "hiroshima-crime", id: string) => ({
  kind, data: Object.fromEntries(fields[kind].map(field => [field, field === "id" ? id : null])),
});
describe("JASPIC production baseline field guard", () => {
  it("rejects missing fields in an existing Shiga baseline", async () => {
    const existing = make("shiga-person", "100");
    const previous = { ...existing.data };
    delete previous.criminal_feature;
    const snapshot = { baseline: true, revision: 4, records: { "shiga-person:100": previous } };
    await expect(productionPlan("shiga", snapshot as never, [existing] as never, new Set()))
      .rejects.toThrow("BASELINE_FIELDS_MISSING");
    expect(plan).not.toHaveBeenCalled();
  });
  it("accepts complete existing records and newly published old-occurrence Shiga IDs", async () => {
    vi.mocked(plan).mockClear();
    const existing = make("shiga-person", "100");
    const newlyPublished = make("shiga-person", "105");
    newlyPublished.data.occurrence_dt = "2026-11-01";
    const baselineRecords = Object.fromEntries(Array.from({ length: 5 }, (_, i) => { const record = make("shiga-person", String(100 + i)); return [`shiga-person:${100 + i}`, record.data]; }));
    const snapshot = { baseline: true, revision: 4, records: baselineRecords };
    await expect(productionPlan("shiga", snapshot as never, [existing, ...Array.from({ length: 4 }, (_, i) => make("shiga-person", String(101 + i))), newlyPublished] as never, new Set()))
      .resolves.toHaveProperty("candidates");
    expect(plan).toHaveBeenCalledOnce();
    expect(vi.mocked(plan).mock.calls[0][2]).toHaveLength(6);
  });
});
