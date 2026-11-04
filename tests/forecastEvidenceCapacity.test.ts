import {expect,test} from "vitest";
import {projectForecastEvidenceCapacity} from "../lib/research/forecastEvidenceCapacity";
const input={targets:12,pollsPerTargetPerDay:288,bytesPerSnapshot:1656,retentionDays:7,budgetBytes:50_000_000};
test("estimates explicit JSONB-only volume without asserting disk footprint",()=>{
  const r=projectForecastEvidenceCapacity(input);
  expect(r.dailyBytes).toBe(5_723_136);
  expect(r.retentionBytes).toBe(40_061_952);
  expect(r.exceedsBudget).toBe(false);
});
test("flags a candidate retention window above budget without deleting",()=>{
  expect(projectForecastEvidenceCapacity({...input,retentionDays:14}).exceedsBudget).toBe(true);
});
test("rejects invalid or overflowed projections",()=>{
  expect(()=>projectForecastEvidenceCapacity({...input,budgetBytes:0})).toThrow("INVALID_CAPACITY_INPUT");
  expect(()=>projectForecastEvidenceCapacity({...input,targets:-1})).toThrow("INVALID_CAPACITY_INPUT");
  expect(()=>projectForecastEvidenceCapacity({...input,targets:1e12,bytesPerSnapshot:1e12})).toThrow("CAPACITY_OVERFLOW");
});
