import { fields } from "../../supabase/functions/_shared/jaspic/mail";
import { plan, type Snapshot } from "../../supabase/functions/_shared/jaspic/state";
import type { Item, Province } from "../../supabase/functions/_shared/jaspic/collect";

export async function productionPlan(province: Province, snapshot: Snapshot, items: Item[], legacy: ReadonlySet<string>) {
  if (!snapshot.baseline || snapshot.revision < 4) throw new Error("BASELINE_REQUIRED");
  const kinds = province === "hiroshima" ? ["hiroshima-person", "hiroshima-crime"] as const : ["shiga-person"] as const;
  for (const kind of kinds) {
    const oldCount = Object.keys(snapshot.records).filter(k => k.startsWith(kind+":")).length;
    const currentCount = items.filter(i => i.kind === kind).length;
    if (!oldCount || currentCount < oldCount * .8 || currentCount > oldCount * 1.2) throw new Error("SOURCE_COUNT_GUARD");
  }
  // The legacy portal LINKKEY is not a reversible encoding of the current map ID.
  // Never guess a mapping or dispatch a historical reappearance as a new event.
  for (const item of items) {
    const previous = snapshot.records[`${item.kind}:${item.data.id}`];
    if (!previous && !legacy.has(item.data.id ?? "")) {
      const date = item.data.occurrence_dt ?? item.data.occurrence_date_from ?? "";
      if (date.slice(0,10).replaceAll("/","-") <= "2026-11-06") throw new Error("HISTORICAL_ID_REQUIRES_RECONCILIATION");
    }
    if (previous && fields[item.kind].some(f => !Object.hasOwn(previous,f))) throw new Error("BASELINE_FIELDS_MISSING");
  }
  const result = await plan(province, snapshot, items, {legacyHiroshimaPersonIds:legacy});
  if (result.candidates.length > 20) throw new Error("DIFFERENCE_LIMIT");
  return result;
}
