/** Snapshot of the exact forecast and branch conditions used for a successfully sent push.
 * This is prediction evidence, not actual observed ground truth.
 * No credentials, push endpoints, or owner identifiers belong here.
 */
export type DecisionEvidenceFrame = {
  validTime?: string | null;
  baseTime?: string | null;
  status?: string | null;
  intensityClass?: string | null;
  rgba?: { r: number; g: number; b: number; a: number } | null;
};
export function buildNotificationDecisionEvidence(args: {
  checkedAt: string;
  sourceValidAt: string | null;
  source: string | null;
  eventType: string;
  decisionEventType: string;
  urgency: string;
  currentStatus: string | null;
  observationRgba: DecisionEvidenceFrame["rgba"];
  forecast: DecisionEvidenceFrame[];
  endingShadow: unknown;
  decisionReasons: {
    severeEscalation: boolean;
    rainEnding: boolean;
    confirmedAndEnding: boolean;
    returningRain: boolean;
    rainConfirmed: boolean;
    previousConfirmedWeather: string | null;
  };
}) {
  return {
    schemaVersion: 1,
    checkedAt: args.checkedAt,
    sourceValidAt: args.sourceValidAt,
    source: args.source,
    eventType: args.eventType,
    deliveredEventType: args.decisionEventType,
    urgency: args.urgency,
    current: { status: args.currentStatus, rgba: args.observationRgba ?? null },
    forecast: args.forecast.map(frame => ({
      validTime: frame.validTime ?? null,
      baseTime: frame.baseTime ?? null,
      status: frame.status ?? null,
      intensityClass: frame.intensityClass ?? null,
      rgba: frame.rgba ?? null,
    })),
    endingShadow: args.endingShadow,
    decisionReasons: args.decisionReasons,
    motion: { status: "UNKNOWN", reason: "NOT_COMPUTED" },
  };
}
