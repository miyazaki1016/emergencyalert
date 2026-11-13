import {describe,expect,it} from "vitest";
import {selectDispatchBatch} from "../lib/jaspic/dispatch-batch";

describe("JASPIC dispatch batch selection (no sending)",()=>{
  it.each([34,50,100])("preserves every one of %i candidates over repeated 20-item batches",(total)=>{
    let remaining=Array.from({length:total},(_,i)=>i);
    const seen:number[]=[];
    while(remaining.length){
      const batch=selectDispatchBatch(remaining,300_000);
      expect(batch.selected.length).toBeGreaterThan(0);
      expect(batch.selected.length).toBeLessThanOrEqual(20);
      seen.push(...batch.selected);
      remaining=batch.remaining;
    }
    expect(seen).toEqual(Array.from({length:total},(_,i)=>i));
  });
  it("does not select any message if the safety reserve would be exceeded",()=>{
    const input=[1,2,3];
    expect(selectDispatchBatch(input,65_000)).toEqual({selected:[],remaining:input});
    expect(selectDispatchBatch(input,70_000)).toEqual({selected:[1],remaining:[2,3]});
  });
  it("does not mutate or reorder a cross-province queue",()=>{
    const pending=[{province:"hiroshima",key:"a"},{province:"shiga",key:"b"},{province:"hiroshima",key:"c"}];
    const result=selectDispatchBatch(pending,300_000,2);
    expect(result.selected).toEqual(pending.slice(0,2));
    expect(result.remaining).toEqual(pending.slice(2));
    expect(pending).toHaveLength(3);
  });
  it("rejects invalid time or batch limits",()=>{
    expect(()=>selectDispatchBatch([1],Number.NaN)).toThrow("INVALID_BATCH_BUDGET");
    expect(()=>selectDispatchBatch([1],300_000,21)).toThrow("INVALID_BATCH_BUDGET");
  });
});
