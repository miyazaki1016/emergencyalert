import {describe,expect,it} from "vitest";
import {hasBulkSendTimeBudget} from "../lib/jaspic/bulk-send-budget";

describe("JASPIC bulk-send time budget",()=>{
  it("permits 23 candidates when preflight is fast",()=>{
    expect(hasBulkSendTimeBudget(23,0)).toBe(true);
    expect(hasBulkSendTimeBudget(23,10_000)).toBe(true);
  });
  it("rejects before preparing deliveries if the timeout budget is insufficient",()=>{
    expect(hasBulkSendTimeBudget(25,0)).toBe(false);
    expect(hasBulkSendTimeBudget(23,11_000)).toBe(false);
    expect(hasBulkSendTimeBudget(1,231_000)).toBe(false);
  });
  it("rejects invalid counts and elapsed times",()=>{
    expect(hasBulkSendTimeBudget(-1,0)).toBe(false);
    expect(hasBulkSendTimeBudget(1.5,0)).toBe(false);
    expect(hasBulkSendTimeBudget(1,Number.NaN)).toBe(false);
  });
});
