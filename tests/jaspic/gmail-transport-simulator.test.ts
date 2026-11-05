import { describe, expect, it } from "vitest";
import {
  simulateGmailDelivery, type SimulatedDelivery,
} from "../../supabase/functions/_shared/jaspic/gmail-transport-simulator";

const fresh = (): SimulatedDelivery => ({ key: "hiroshima-crime:synthetic-id", state: "NEW", attempted: false });
describe("Gmail delivery simulator - NO external connections", () => {
  it("accepts a synthetic result once and blocks any repeat", () => {
    const result = simulateGmailDelivery(fresh(), { scenario: "accepted", syntheticMessageId: "synthetic-123" });
    expect(result).toEqual({
      key: "hiroshima-crime:synthetic-id", state: "ACCEPTED", attempted: true,
      syntheticMessageId: "synthetic-123",
    });
    expect(() => simulateGmailDelivery(result, { scenario: "accepted", syntheticMessageId: "synthetic-123" })).toThrow();
  });
  it("never automatically retries unknown or failed outcomes", () => {
    const timedOut = simulateGmailDelivery(fresh(), { scenario: "timeout" });
    expect(timedOut.state).toBe("UNKNOWN");
    expect(() => simulateGmailDelivery(timedOut, { scenario: "accepted", syntheticMessageId: "synthetic-123" })).toThrow();

    const rejected = simulateGmailDelivery(fresh(), { scenario: "rejected" });
    expect(rejected.state).toBe("FAILED");
    expect(() => simulateGmailDelivery(rejected, { scenario: "accepted", syntheticMessageId: "synthetic-123" })).toThrow();
  });
  it("rejects invalid keys, fake IDs and pre-attempted records", () => {
    expect(() => simulateGmailDelivery({ ...fresh(), key: "x\r\nInjected: y" }, { scenario: "timeout" })).toThrow();
    expect(() => simulateGmailDelivery(fresh(), { scenario: "accepted", syntheticMessageId: "real-looking-id" })).toThrow();
    expect(() => simulateGmailDelivery({ ...fresh(), attempted: true }, { scenario: "timeout" })).toThrow();
  });
  it("does not mutate the stored record", () => {
    const before = Object.freeze(fresh());
    simulateGmailDelivery(before, { scenario: "timeout" });
    expect(before).toEqual({ key: "hiroshima-crime:synthetic-id", state: "NEW", attempted: false });
  });
});
