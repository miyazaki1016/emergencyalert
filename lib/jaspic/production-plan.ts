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
  // LINKKEY from the legacy portal cannot be mapped back to the map ID.
  // An old occurrence date is NOT a publication date. Keep unseen historical
  // IDs out of both the delivery queue and the committed baseline until the
  // historical send ledger is reconciled. This must not suppress safe changes
  // to already-known IDs or prevent newly occurring events from being planned.
  const quarantined: string[] = [];
  const eligibleItems: Item[] = [];
  for (const item of items) {
    const key = `${item.kind}:${item.data.id}`;
    const previous = snapshot.records[key];
    if (previous && fields[item.kind].some(f => !Object.hasOwn(previous,f))) throw new Error("BASELINE_FIELDS_MISSING");
    const legacyPerson = item.kind === "hiroshima-person" && legacy.has(item.data.id ?? "");
    if (!previous && !legacyPerson) {
      const date = item.data.occurrence_dt ?? item.data.occurrence_date_from ?? "";
      if (date.slice(0,10).replaceAll("/","-") <= "2026-11-06") {
        quarantined.push(key);
        continue;
      }
    }
    eligibleItems.push(item);
  }
  // The source-count guard above always uses the COMPLETE source, not this
  // reduced planning set. Quarantined records are reconsidered on each run.
  const result = await plan(province, snapshot, eligibleItems, {legacyHiroshimaPersonIds:legacy});
  if (result.candidates.length > 20) throw new Error("DIFFERENCE_LIMIT");
  return {...result, quarantined};
}
