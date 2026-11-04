import { fields, type Kind, type RecordData, generateMail, month } from "./mail.ts";
import type { Item, Province } from "./collect.ts";

export type Snapshot = { revision: number; baseline: boolean; records: Record<string, RecordData> };
export type Candidate = { key: string; version: string; mail: ReturnType<typeof generateMail> };
export const keyOf = (kind: Kind, id: string) => `${kind}:${id}`;
export async function digest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
const compareFields = (kind: Kind) => fields[kind].filter(f => f !== "latitude" && f !== "longitude");
function day(value: string | null): string {
  month(value); // validates the calendar date without timezone conversion
  const match = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/.exec(value!)!;
  return `${match[1]}-${match[2].padStart(2,"0")}-${match[3].padStart(2,"0")}`;
}
function eligible(item: Item, previous: RecordData | null, all: Record<string, RecordData>): boolean {
  const d = item.data;
  if (item.kind === "shiga-person") return day(d.occurrence_dt) >= "2024-01-01";
  if (d.case_type === "自転車盗") return false;
  if (item.kind === "hiroshima-person") return true;
  if (day(d.occurrence_date_from) < "2023-06-01") return false;
  // Legacy criminal_chk applies only to new IDs, before inserting each record.
  return previous !== null || !Object.entries(all).some(([key, old]) => key.startsWith("hiroshima-crime:") &&
    old.occurrence_date_from === d.occurrence_date_from && old.occurrence_date_to === d.occurrence_date_to && d.id!.includes(old.id!));
}
export async function plan(province: Province, snapshot: Snapshot, items: Item[], options: {legacyHiroshimaPersonIds?: ReadonlySet<string>} = {}) {
  if (!items.length || items.some(i => !i.kind.startsWith(province))) throw new Error("Incomplete or mixed snapshot");
  const records = { ...snapshot.records }; const candidates: Candidate[] = []; const seen = new Set<string>();
  // Unknown removed records remain tombstones: reappearing historical IDs are never new.
  for (const item of items) {
    if (!item.data.id) throw new Error("Missing ID");
    const key = keyOf(item.kind, item.data.id);
    if (seen.has(key)) throw new Error("Duplicate ID"); seen.add(key);
    const previous = records[key] ?? null;
    const changed = previous === null || compareFields(item.kind).some(f => previous[f] !== item.data[f]);
    if (!snapshot.baseline || changed) {
      const legacyExcluded = item.kind === "hiroshima-person" && options.legacyHiroshimaPersonIds?.has(item.data.id);
      if (snapshot.baseline && !legacyExcluded && eligible(item, previous, records)) {
        const version = await digest(compareFields(item.kind).map(f => [f, item.data[f]]));
        candidates.push({ key, version, mail: generateMail(item.kind, item.data, previous, item.context) });
      }
      records[key] = item.data;
    }
    // Coordinate-only changes intentionally do not update stored values, matching C#.
  }
  return { expectedRevision: snapshot.revision, records, candidates, baseline: true as const };
}

export type DeliveryStatus = "PREPARED" | "SENDING" | "SENT" | "UNKNOWN" | "CANCELLED";
export function transition(status: DeliveryStatus, event: "claim" | "accepted" | "uncertain" | "cancel"): DeliveryStatus {
  if (event === "claim" && status === "PREPARED") return "SENDING";
  if (event === "accepted" && status === "SENDING") return "SENT";
  if (event === "uncertain" && status === "SENDING") return "UNKNOWN";
  if (event === "cancel" && status === "PREPARED") return "CANCELLED";
  throw new Error("Unsafe delivery transition");
}
