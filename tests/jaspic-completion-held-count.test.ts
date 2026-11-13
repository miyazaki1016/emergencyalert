import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { productionPlan } from "../lib/jaspic/production-plan";
import { fields, type RecordData } from "../supabase/functions/_shared/jaspic/mail";
import type { Item } from "../supabase/functions/_shared/jaspic/collect";

const sql = readFileSync("docs/sql/jaspic-completion-notification-held-count.sql", "utf8");
describe("JASPIC per-run completion hold notice", () => {
  it("uses the current run result, not accumulated pending or old holds", () => {
    expect(sql).toContain("r.result->'quarantined'");
    expect(sql).toContain("jsonb_array_length(r.result->'quarantined')");
    expect(sql).toContain("count(distinct q->>'province')");
    expect(sql).not.toMatch(/from\s+public\.jaspic_deliveries/i);
  });
  it("marks any nonzero hold as requiring review, without masking malformed counts", () => {
    expect(sql).toContain("case when hh+sh>0 then '配信完了・保留要確認'");
    expect(sql).toContain("COMPLETION_RESULT_INVALID");
    expect(sql).toContain("DISPATCH_HOLD_REVIEW");
  });
  it("never counts excluded bicycle theft as held", async () => {
    const make = (id: string, kind: "hiroshima-crime" | "hiroshima-person", bicycle = false): Item => {
      const data = Object.fromEntries(fields[kind].map(f => [f, ""])) as RecordData;
      Object.assign(data, { id, occurrence_date_from: "2026-11-01", occurrence_date_to: "2026-11-01", occurrence_dt: "2026-11-01", case_type: bicycle ? "自転車盗" : "声掛け" });
      return { kind, data, context: {cityName:"テスト市",stationName:"テスト署"} };
    };
    const old = [...Array.from({length:10}, (_,i)=>make(String(i+1),"hiroshima-crime")),
      ...Array.from({length:10}, (_,i)=>make(String(i+101),"hiroshima-person"))];
    const snapshot = { baseline:true, revision:5, records:Object.fromEntries(old.map(x=>[x.kind+":"+x.data.id,x.data])) };
    const result = await productionPlan("hiroshima", snapshot, [...old, make("99","hiroshima-crime",true)], new Set());
    expect(result.quarantined).toEqual([]);
    expect(result.candidates).toHaveLength(0);
  });
});
