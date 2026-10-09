import { describe, expect, test } from "vitest";
import { PNG } from "pngjs";
import { measureWorker } from "./national-rain-throughput-harness";

const jobs = Array.from({length:6},(_,i)=>({id:i+1,run_key:"proof",basetime:"20260930060000",validtime:"20260930060500",zoom:10,tile_x:227,tile_y:100}));
const png = new PNG({width:1,height:1});
png.data.set([255,40,0,255]);
const body=PNG.sync.write(png);

describe("read-only worker throughput harness",()=>{
  test("executes real bounded worker and serializes results without real database",async()=>{
    const measured=await measureWorker({jobs,concurrency:4,fetcher:async()=>new Response(new Uint8Array(body)),resolveMunicipalities:async()=>[{code:"13101",prefecture:"東京都",municipality:"千代田区"}]});
    expect(measured.result.done).toBe(6);
    expect(measured.batches.map(b=>b.jobs)).toEqual([4,2]);
    expect(measured.municipalityHits).toBe(6);
    expect(measured.serializedBytes).toBeGreaterThan(0);
    expect(measured.capacityExtrapolationAllowed).toBe(false);
  });
  test("failed N03 evidence cannot be reported as throughput success",async()=>{
    await expect(measureWorker({jobs,concurrency:4,fetcher:async()=>new Response(new Uint8Array(body)),resolveMunicipalities:async()=>{throw new Error("missing N03");}})).rejects.toThrow("Proof worker failed");
  });
});
