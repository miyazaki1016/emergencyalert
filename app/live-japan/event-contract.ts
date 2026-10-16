/**
 * Provider-neutral event envelope for LIVE JAPAN and future consumers (e.g. Misaki).
 * This module defines a contract only; no external feed is connected.
 */
export type EventCategory = "earthquake" | "tsunami" | "weather_warning" | "rain" | "snow" | "wind" | "heat" | "season";
export type EventLifecycle = "issued" | "updated" | "corrected" | "cancelled" | "expired";
export type EventSeverity = "emergency" | "warning" | "advisory" | "information";
export type EventEnvelope = {
  /** Globally unique event identity, stable across revisions. */
  eventId: string;
  /** Monotonically increasing revision for a given eventId. */
  revision: number;
  category: EventCategory;
  lifecycle: EventLifecycle;
  severity: EventSeverity;
  title: string;
  description: string;
  /** Region codes, never inferred from a display label. */
  regionCodes: string[];
  source: { provider: string; sourceId: string; publishedAt: string; sourceUrl?: string };
  observedAt?: string;
  effectiveAt: string;
  expiresAt?: string;
  receivedAt: string;
  /** Demo must never be mixed into a real-data feed. */
  mode: "demo" | "live";
  /** Cancellation/expiration only affects the matching eventId. */
  replacesRevision?: number;
};
export type ApplyResult = { state: Map<string, EventEnvelope>; accepted: boolean; reason: "applied" | "duplicate" | "stale" | "invalid" };
const isIsoDate = (v: string) => Number.isFinite(Date.parse(v));
export function applyEventRevision(previous: ReadonlyMap<string, EventEnvelope>, event: EventEnvelope): ApplyResult {
  const state = new Map(previous);
  if (!event.eventId || !Number.isSafeInteger(event.revision) || event.revision < 1 ||
      !event.source.provider || !event.source.sourceId || !event.regionCodes.length ||
      !isIsoDate(event.effectiveAt) || !isIsoDate(event.receivedAt) || !isIsoDate(event.source.publishedAt) ||
      (event.expiresAt !== undefined && !isIsoDate(event.expiresAt))) {
    return { state, accepted: false, reason: "invalid" };
  }
  const old = state.get(event.eventId);
  if (old && old.mode !== event.mode) return { state, accepted: false, reason: "invalid" };
  if (old && old.revision === event.revision) return { state, accepted: false, reason: "duplicate" };
  if (old && old.revision > event.revision) return { state, accepted: false, reason: "stale" };
  state.set(event.eventId, event);
  return { state, accepted: true, reason: "applied" };
}
export function isActiveEvent(event: EventEnvelope, at: Date): boolean {
  if (event.lifecycle === "cancelled" || event.lifecycle === "expired") return false;
  const now = at.getTime();
  return now >= Date.parse(event.effectiveAt) && (!event.expiresAt || now < Date.parse(event.expiresAt));
}
export function visibleLiveEvents(state: ReadonlyMap<string, EventEnvelope>, at: Date): EventEnvelope[] {
  return [...state.values()].filter(e => e.mode === "live" && isActiveEvent(e, at));
}
