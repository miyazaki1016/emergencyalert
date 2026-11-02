/** Research-only capacity projection; not a storage quota or cleanup trigger.
 * Estimates JSONB evidence payload only, not TOAST, indexes or WAL.
 */
export type CapacityProjection = {
  dailyBytes: number;
  retentionBytes: number;
  exceedsBudget: boolean;
  utilization: number;
};
export function projectForecastEvidenceCapacity(input:{
  targets:number;pollsPerTargetPerDay:number;bytesPerSnapshot:number;
  retentionDays:number;budgetBytes:number;
}):CapacityProjection {
  const values=Object.values(input);
  if(values.some(v=>!Number.isFinite(v)||v<0)||
    !Number.isInteger(input.targets)||!Number.isInteger(input.pollsPerTargetPerDay)||
    !Number.isInteger(input.bytesPerSnapshot)||!Number.isInteger(input.retentionDays)||
    !Number.isInteger(input.budgetBytes)||input.budgetBytes===0) throw Error("INVALID_CAPACITY_INPUT");
  const dailyBytes=input.targets*input.pollsPerTargetPerDay*input.bytesPerSnapshot;
  const retentionBytes=dailyBytes*input.retentionDays;
  if(!Number.isSafeInteger(dailyBytes)||!Number.isSafeInteger(retentionBytes)) throw Error("CAPACITY_OVERFLOW");
  return {dailyBytes,retentionBytes,exceedsBudget:retentionBytes>input.budgetBytes,
    utilization:retentionBytes/input.budgetBytes};
}
