/** Research-only capacity policy proposal. Does not suppress writes, delete
 * records, or change notifications. Missing metrics must never be read as 0.
 */
export type BudgetGateResult = {
  status:"WITHIN_BUDGET"|"NEAR_BUDGET"|"OVER_BUDGET"|"UNKNOWN";
  projectedBytes:number|null;
  remainingBytes:number|null;
};
export function assessForecastEvidenceBudget(input:{
  measuredBytes:number|null;
  projectedDailyBytes:number|null;
  budgetBytes:number;
  warningRatio:number;
}):BudgetGateResult {
  const {measuredBytes,projectedDailyBytes,budgetBytes,warningRatio}=input;
  if(!Number.isSafeInteger(budgetBytes)||budgetBytes<=0||
    !Number.isFinite(warningRatio)||warningRatio<=0||warningRatio>=1)
    throw Error("INVALID_BUDGET_POLICY");
  for(const value of [measuredBytes,projectedDailyBytes]){
    if(value!==null&&(!Number.isSafeInteger(value)||value<0))
      throw Error("INVALID_BUDGET_MEASUREMENT");
  }
  if(measuredBytes===null||projectedDailyBytes===null)
    return {status:"UNKNOWN",projectedBytes:null,remainingBytes:null};
  const projectedBytes=measuredBytes+projectedDailyBytes;
  if(!Number.isSafeInteger(projectedBytes)) throw Error("BUDGET_OVERFLOW");
  const remainingBytes=Math.max(0,budgetBytes-projectedBytes);
  return {status:projectedBytes>budgetBytes?"OVER_BUDGET":
    projectedBytes>=budgetBytes*warningRatio?"NEAR_BUDGET":"WITHIN_BUDGET",
    projectedBytes,remainingBytes};
}
