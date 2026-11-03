import {expect,test} from "vitest";
import {shouldCaptureForecastEvidence as allowed, limitForecastEvidencePayload} from "../supabase/functions/_shared/forecastEvidencePilot";

const start="2026-11-03T01:00:00.000Z",end="2026-11-04T01:00:00.000Z";
test("opt-in is disabled when either config is missing",()=>{
 expect(allowed(start,undefined,end)).toBe(false);
 expect(allowed(start,start,undefined)).toBe(false);
 expect(allowed(start,undefined,undefined)).toBe(false);
});
test("the precise 24-hour window is inclusive at start and exclusive at end",()=>{
 expect(allowed(start,start,end)).toBe(true);
 expect(allowed("2026-11-03T23:59:59.999Z",start,end)).toBe(true);
 expect(allowed(end,start,end)).toBe(false);
 expect(allowed("2026-11-03T00:59:59.999Z",start,end)).toBe(false);
});
test("overlong, reversed and zero length windows always fail closed",()=>{
 expect(allowed(start,start,"2026-11-04T01:00:00.001Z")).toBe(false);
 expect(allowed(start,end,start)).toBe(false);
 expect(allowed(start,start,start)).toBe(false);
});
test("malformed or normalized impossible ISO dates cannot enable capture",()=>{
 expect(allowed(start,"2026-02-31T01:00:00.000Z",end)).toBe(false);
 expect(allowed(start,"2026-11-03",end)).toBe(false);
 expect(allowed(start,start,"not-a-date")).toBe(false);
 expect(allowed("invalid",start,end)).toBe(false);
});

test("oversized evidence is skipped without dropping or truncating individual frames",()=>{
 const compact={frames:Array.from({length:250},(_,i)=>["20261104000000","20261104000500","RAIN","30_TO_50",[i%256,34,56,255]])};
 expect(limitForecastEvidencePayload(compact,128)).toBeNull();
 expect(compact.frames).toHaveLength(250);
 expect(limitForecastEvidencePayload(compact,50000)).toBe(compact);
});
test("UTF-8 byte accounting and invalid limits",()=>{
 expect(limitForecastEvidencePayload({label:"雨"},12)).toBeNull();
 expect(limitForecastEvidencePayload({label:"雨"},20)).toEqual({label:"雨"});
 expect(()=>limitForecastEvidencePayload({},0)).toThrow("INVALID_EVIDENCE_BYTE_LIMIT");
 expect(limitForecastEvidencePayload({x:BigInt(1)})).toBeNull();
});
