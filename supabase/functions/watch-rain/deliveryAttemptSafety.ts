/**
 * Offline proposal for one subscription's outbox attempt.
 *
 * This helper is deliberately NOT called by the active worker. A crash-safe
 * worker requires a database unique episode key, atomic claim, fenced lease,
 * and separate per-subscription attempt rows before this policy can be used.
 *
 * A push transport can have an UNKNOWN result: timeout != confirmed failure.
 * An expired claim cannot prove that no Push was sent. Never automatically
 * resend in either situation.
 */
export type AttemptState =
  | "CREATED"          // durable row exists and no sender has claimed it
  | "CLAIMED"          // a sender owns a persisted claim; send may have begun
  | "ACCEPTED"         // transport explicitly accepted one send
  | "FAILED_TERMINAL"  // endpoint permanently invalidated (404/410)
  | "UNCERTAIN";       // sender crashed, timed out, or lease expired

export type AttemptAction =
  | { type: "CLAIM"; workerId: string }
  | { type: "ACCEPT" }
  | { type: "REJECT_TERMINAL" }
  | { type: "SEND_OUTCOME_UNKNOWN" }
  | { type: "LEASE_EXPIRED" };

export type AttemptRecord = {
  state: AttemptState;
  owner: string | null;
};

export type AttemptTransition = {
  record: AttemptRecord;
  changed: boolean;
  maySend: boolean;
  reason: string;
};

export function transitionAttempt(
  previous: AttemptRecord,
  action: AttemptAction,
): AttemptTransition {
  const unchanged = (reason: string): AttemptTransition =>
    ({ record: previous, changed: false, maySend: false, reason });

  if (action.type === "CLAIM") {
    if (!action.workerId.trim()) return unchanged("invalid_worker");
    if (previous.state !== "CREATED") return unchanged("already_claimed_or_terminal");
    return {
      record: { state: "CLAIMED", owner: action.workerId },
      changed: true,
      maySend: true,
      reason: "claimed_once",
    };
  }
  if (action.type === "LEASE_EXPIRED") {
    if (previous.state !== "CLAIMED") return unchanged("not_claimed");
    return {
      record: { state: "UNCERTAIN", owner: null }, changed: true,
      maySend: false, reason: "lease_expired_outcome_unknown",
    };
  }
  if (previous.state !== "CLAIMED") return unchanged("outcome_without_claim");
  if (action.type === "ACCEPT") return {
    record: { state: "ACCEPTED", owner: null }, changed: true,
    maySend: false, reason: "transport_accepted",
  };
  if (action.type === "REJECT_TERMINAL") return {
    record: { state: "FAILED_TERMINAL", owner: null }, changed: true,
    maySend: false, reason: "endpoint_unavailable",
  };
  if (action.type === "SEND_OUTCOME_UNKNOWN") return {
    record: { state: "UNCERTAIN", owner: null }, changed: true,
    maySend: false, reason: "send_result_unknown",
  };
  return unchanged("unsupported_action");
}
