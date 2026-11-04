import { expect, it } from "vitest";
import fixtures from "./fixtures.json";
import { plan, transition, type Snapshot } from "../../supabase/functions/_shared/jaspic/state";
import type { Item } from "../../supabase/functions/_shared/jaspic/collect";
const fixture = fixtures[0];
const item: Item = { kind: "hiroshima-crime", data: fixture.current, context: fixture };
const empty: Snapshot = { revision: 0, baseline: false, records: {} };
it("baseline is silent; identical/coordinate-only runs are silent; update is one candidate", async () => {
  const initial = await plan("hiroshima", empty, [item]);
  expect(initial.candidates).toHaveLength(0);
  const snapshot = { ...initial, revision: 1 };
  expect((await plan("hiroshima", snapshot, [item])).candidates).toHaveLength(0);
  const coord = { ...item, data: { ...item.data, latitude: "35" } };
  const unchanged = await plan("hiroshima", snapshot, [coord]);
  expect(unchanged.candidates).toHaveLength(0);
  expect(unchanged.records["hiroshima-crime:TEST-0001"].latitude).toBe(item.data.latitude);
  const changed = { ...coord, data: { ...coord.data, address: "架空更新" } };
  const result = await plan("hiroshima", snapshot, [changed]);
  expect(result.candidates).toHaveLength(1);
  expect(result.candidates[0].mail.body).toContain('"latitude":"35",　→緯度（参考程度）●更新');
  expect((await plan("hiroshima", { ...result, revision: 2 }, [changed])).candidates).toHaveLength(0);
});
it("keeps old IDs after disappearance and never promotes an empty/duplicate/mixed baseline", async () => {
  const initial = await plan("hiroshima", empty, [item]);
  const second = { ...item, data: { ...item.data, id: "OTHER" } };
  const next = await plan("hiroshima", { ...initial, revision: 1 }, [second]);
  expect(next.records["hiroshima-crime:TEST-0001"]).toBeDefined();
  expect((await plan("hiroshima", { ...next, revision: 2 }, [item])).candidates).toHaveLength(0);
  await expect(plan("hiroshima", empty, [])).rejects.toThrow();
  await expect(plan("hiroshima", empty, [item,item])).rejects.toThrow();
  await expect(plan("shiga", empty, [item])).rejects.toThrow();
});
it("preserves exclusion, legacy similar-ID check and historical date cutoff", async () => {
  const baseline = await plan("hiroshima", empty, [item]);
  const snapshot = { ...baseline, revision: 1 };
  for (const data of [{...item.data,id:"NEW",case_type:"自転車盗"},{...item.data,id:"NEW",occurrence_date_from:"2023/05/31 23:59:00"},{...item.data,id:"TEST-0001-more"}]) {
    expect((await plan("hiroshima", snapshot, [{...item,data}])).candidates).toHaveLength(0);
  }
});
it("never retries UNKNOWN, SENT or a claimed delivery", () => {
  expect(transition(transition("PREPARED","claim"),"uncertain")).toBe("UNKNOWN");
  for (const status of ["SENDING","SENT","UNKNOWN","CANCELLED"] as const) expect(() => transition(status,"claim")).toThrow();
});
