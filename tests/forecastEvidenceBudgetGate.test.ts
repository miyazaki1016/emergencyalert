import {expect,test} from "vitest";
import {assessForecastEvidenceBudget} from "../lib/research/forecastEvidenceBudgetGate";
const base={measuredBytes:60,projectedDailyBytes:10,budgetBytes:100,warningRatio:0.8};
test("distinguishes healthy, warning and projected overflow",()=>{
 expect(assessForecastEvidenceBudget(base)).toEqual({status:"WITHIN_BUDGET",projectedBytes:70,remainingBytes:30});
 expect(assessForecastEvidenceBudget({...base,measuredBytes:70}).status).toBe("NEAR_BUDGET");
 expect(assessForecastEvidenceBudget({...base,measuredBytes:91}).status).toBe("OVER_BUDGET");
});
test("missing measurement is unknown, never treated as empty database",()=>{
 expect(assessForecastEvidenceBudget({...base,measuredBytes:null})).toEqual({
   status:"UNKNOWN",projectedBytes:null,remainingBytes:null
 });
 expect(assessForecastEvidenceBudget({...base,projectedDailyBytes:null}).status).toBe("UNKNOWN");
});
test("rejects invalid budget policy and corrupt measurements",()=>{
 expect(()=>assessForecastEvidenceBudget({...base,budgetBytes:0})).toThrow("INVALID_BUDGET_POLICY");
 expect(()=>assessForecastEvidenceBudget({...base,warningRatio:1})).toThrow("INVALID_BUDGET_POLICY");
 expect(()=>assessForecastEvidenceBudget({...base,measuredBytes:-1})).toThrow("INVALID_BUDGET_MEASUREMENT");
 expect(()=>assessForecastEvidenceBudget({...base,measuredBytes:Number.MAX_SAFE_INTEGER})).toThrow("BUDGET_OVERFLOW");
});
