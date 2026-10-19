import { describe, expect, it } from "vitest";
import { isMissingDecisionSnapshotColumn } from "../supabase/functions/watch-rain/deliverySchemaCompat";

describe("delivery evidence schema rollout compatibility", () => {
  it("permits legacy history fallback only for a missing snapshot column", () => {
    expect(isMissingDecisionSnapshotColumn({code:"42703",message:'column "decision_snapshot" does not exist'})).toBe(true);
    expect(isMissingDecisionSnapshotColumn({code:"PGRST204",message:"Could not find the 'decision_snapshot' column in schema cache"})).toBe(true);
  });
  it("does not retry access-denied, arbitrary missing columns or network failures", () => {
    expect(isMissingDecisionSnapshotColumn({code:"42501",message:"permission denied for decision_snapshot"})).toBe(false);
    expect(isMissingDecisionSnapshotColumn({code:"42703",message:'column "owner_id" does not exist'})).toBe(false);
    expect(isMissingDecisionSnapshotColumn({code:"PGRST301",message:"JWT expired"})).toBe(false);
    expect(isMissingDecisionSnapshotColumn(null)).toBe(false);
  });
});
