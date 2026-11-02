import {expect,test} from "vitest";
import {assessEvidenceWriteHealth as assess} from "../lib/research/forecastEvidenceFailureMonitor";
test("consecutive failures escalate and success resets the streak",()=>{
 expect(assess(["FAILED","SUCCESS","FAILED","FAILED"],2,3)).toEqual({status:"HEALTHY",consecutiveFailures:1});
 expect(assess(["FAILED","FAILED","SUCCESS"],2,3)).toEqual({status:"WARNING",consecutiveFailures:2});
 expect(assess(["FAILED","FAILED","FAILED"],2,3)).toEqual({status:"CRITICAL",consecutiveFailures:3});
 expect(assess(["SUCCESS","FAILED","FAILED"],2,3)).toEqual({status:"HEALTHY",consecutiveFailures:0});
});
test("unknown observations do not count as success or fabricated failures",()=>{
 expect(assess([],2,3).status).toBe("UNKNOWN");
 expect(assess(["UNKNOWN","FAILED"],2,3).status).toBe("UNKNOWN");
 expect(assess(["FAILED","UNKNOWN","FAILED"],2,3)).toEqual({status:"HEALTHY",consecutiveFailures:1});
});
test("rejects invalid thresholds and outcomes",()=>{
 expect(()=>assess(["FAILED"],2,2)).toThrow("INVALID_FAILURE_THRESHOLDS");
 expect(()=>assess(["FAILED"],0,3)).toThrow("INVALID_FAILURE_THRESHOLDS");
 expect(()=>assess(["BROKEN" as "FAILED"],2,3)).toThrow("INVALID_WRITE_OUTCOME");
});
