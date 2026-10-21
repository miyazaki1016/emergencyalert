import { describe, expect, it } from "vitest";
import { transitionAttempt, type AttemptRecord } from "../supabase/functions/watch-rain/deliveryAttemptSafety";

const fresh = (): AttemptRecord => ({ state:"CREATED", owner:null });

describe("offline Push claim/crash recovery policy", () => {
  it("allows one claim but no second send from a duplicate worker", () => {
    const first = transitionAttempt(fresh(),{type:"CLAIM",workerId:"w1"});
    expect(first.changed).toBe(true);
    expect(first.maySend).toBe(true);
    const rival = transitionAttempt(first.record,{type:"CLAIM",workerId:"w2"});
    expect(rival.maySend).toBe(false);
    expect(rival.record).toEqual(first.record);
  });
  it("does not retry after a crashed sender's lease expires", () => {
    const claimed = transitionAttempt(fresh(),{type:"CLAIM",workerId:"w1"}).record;
    const crashed = transitionAttempt(claimed,{type:"LEASE_EXPIRED"});
    expect(crashed.record.state).toBe("UNCERTAIN");
    expect(crashed.maySend).toBe(false);
    expect(transitionAttempt(crashed.record,{type:"CLAIM",workerId:"w2"}).maySend).toBe(false);
  });
  it("does not confuse a timeout with confirmed delivery failure", () => {
    const claimed = transitionAttempt(fresh(),{type:"CLAIM",workerId:"w1"}).record;
    const timeout = transitionAttempt(claimed,{type:"SEND_OUTCOME_UNKNOWN"});
    expect(timeout.record.state).toBe("UNCERTAIN");
    expect(transitionAttempt(timeout.record,{type:"CLAIM",workerId:"w2"}).changed).toBe(false);
  });
  it("never resends after provider acceptance", () => {
    const claimed = transitionAttempt(fresh(),{type:"CLAIM",workerId:"w1"}).record;
    const accepted = transitionAttempt(claimed,{type:"ACCEPT"});
    expect(accepted.record.state).toBe("ACCEPTED");
    expect(transitionAttempt(accepted.record,{type:"CLAIM",workerId:"w2"}).maySend).toBe(false);
  });
  it("does not retry invalid endpoints", () => {
    const claimed = transitionAttempt(fresh(),{type:"CLAIM",workerId:"w1"}).record;
    const gone = transitionAttempt(claimed,{type:"REJECT_TERMINAL"});
    expect(gone.record.state).toBe("FAILED_TERMINAL");
    expect(transitionAttempt(gone.record,{type:"CLAIM",workerId:"w1"}).maySend).toBe(false);
  });
  it("does not record outcomes for an unclaimed attempt", () => {
    for (const type of ["ACCEPT","REJECT_TERMINAL","SEND_OUTCOME_UNKNOWN"] as const) {
      const result = transitionAttempt(fresh(),{type});
      expect(result.changed).toBe(false);
      expect(result.record).toEqual(fresh());
    }
  });
  it("rejects empty worker identifiers", () => {
    expect(transitionAttempt(fresh(),{type:"CLAIM",workerId:"  "}).maySend).toBe(false);
  });
  it("never changes terminal results on late or reordered signals", () => {
    const claimed = transitionAttempt(fresh(),{type:"CLAIM",workerId:"w1"}).record;
    const uncertain = transitionAttempt(claimed,{type:"LEASE_EXPIRED"}).record;
    expect(transitionAttempt(uncertain,{type:"ACCEPT"}).changed).toBe(false);
  });
});
