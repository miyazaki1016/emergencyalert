/**
 * Pure, offline Gmail delivery simulator.
 *
 * No HTTP, SMTP, OAuth, environment reads, timers or secret access.
 * This is NOT a production transport. Only canned simulated results are accepted.
 */
import { nextDeliveryState, type DeliveryState } from "./gmail-auth-offline.ts";

export type SimulatedGmailResult =
  | { scenario: "accepted"; syntheticMessageId: string }
  | { scenario: "rejected" }
  | { scenario: "timeout" };

export type SimulatedDelivery = {
  key: string;
  state: DeliveryState;
  attempted: boolean;
  syntheticMessageId?: string;
};

function validateKey(key: string): void {
  if (!/^[a-zA-Z0-9:_-]{1,180}$/.test(key)) throw new Error("Invalid delivery key");
}

/**
 * Executes exactly one simulated delivery attempt. Callers must supply a
 * persistent deduplicated state in actual delivery design; the simulator
 * does NOT provide database locking or a real delivery guarantee.
 */
export function simulateGmailDelivery(
  record: Readonly<SimulatedDelivery>, result: SimulatedGmailResult,
): SimulatedDelivery {
  validateKey(record.key);
  if (record.state !== "NEW" || record.attempted) throw new Error("Delivery already attempted or blocked");
  const leased = nextDeliveryState(record.state, "lease");
  if (result.scenario === "accepted") {
    if (!/^synthetic-[a-z0-9-]{1,120}$/.test(result.syntheticMessageId)) {
      throw new Error("Only synthetic Gmail IDs are accepted");
    }
    return {
      key: record.key,
      state: nextDeliveryState(leased, "accepted"),
      attempted: true,
      syntheticMessageId: result.syntheticMessageId,
    };
  }
  if (result.scenario === "rejected") {
    return { key: record.key, state: nextDeliveryState(leased, "failed"), attempted: true };
  }
  if (result.scenario === "timeout") {
    return { key: record.key, state: nextDeliveryState(leased, "unknown"), attempted: true };
  }
  throw new Error("Unknown simulation scenario");
}
