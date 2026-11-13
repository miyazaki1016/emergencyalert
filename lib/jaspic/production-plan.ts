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
  // A partially migrated baseline must never be treated as a real update.
  // Check only existing records: newly published IDs have no prior fields.
  for (const item of items) {
    const previous = snapshot.records[`${item.kind}:${item.data.id}`];
    if (previous && fields[item.kind].some(field => !Object.prototype.hasOwnProperty.call(previous, field))) {
      throw new Error("BASELINE_FIELDS_MISSING");
    }
  }
  // Occurrence date is not publication date. Do not quarantine new records
  // solely because the event happened on or before the migration cutoff.
  // The existing plan() category filtering, legacy suppression, baseline,
  // delivery ledger and difference guards remain unchanged.
  const quarantined: string[] = [];
  const eligibleItems: Item[] = items;
  // The source-count guard above always uses the COMPLETE source, not this
  // reduced planning set. Quarantined records are reconsidered on each run.
  const result = await plan(province, snapshot, eligibleItems, {legacyHiroshimaPersonIds:legacy});
  return {...result, quarantined};
}
