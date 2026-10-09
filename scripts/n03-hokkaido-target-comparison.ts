// Offline-only alternative to geometric clipping: measure variable-size polygon packs.
// Does not write Storage, change runtime defaults, or claim exact clipping.
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import type { AdministrativeArea } from "../lib/weather/rain/administrativeAreas";
import { affectedAdministrativeAreas } from "../lib/weather/rain/administrativeAreas";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";
import { partitionAreas, resolvePartitionedFootprint } from "./n03-partition-design-core";

function rectangle(w:number,s:number,e:number,n:number):HeavyRainPolygon[] {
  return [{type:"Polygon",coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}];
}
async function main() {
  const path=process.argv[2];if(!path)throw new Error("Expected prepared Hokkaido N03 path");
  const areas=JSON.parse(readFileSync(path,"utf8")) as AdministrativeArea[];
  if(areas.length!==194||areas.some(a=>!a.code.startsWith("01")))throw new Error("Unexpected Hokkaido source");
  const queries=[
    rectangle(144.8,43.5,145.4,44.1),rectangle(141.2,42.8,141.7,43.2),
    rectangle(142.5,43.2,143.2,43.8),rectangle(140.4,41.5,141.1,42.1),
    rectangle(145.0,43.9,145.6,44.5),rectangle(141.6,44.7,142.3,45.3),
    rectangle(139,41,146,46),rectangle(143,42,143.1,42.1),
  ];
  const expected=queries.map(q=>affectedAdministrativeAreas(q,areas).map(a=>a.code));
  for(const targetMiB of [1,1.5,2,4]) {
    const start=performance.now(),{index,files}=partitionAreas(areas,Math.floor(targetMiB*1048576));
    const rows=[];
    for(let i=0;i<queries.length;i++){
      const t=performance.now();
      const result=await resolvePartitionedFootprint(queries[i],index,async(file)=>Buffer.from(files.get(file)??""));
      const actual=result.municipalities.map(a=>a.code);
      if(JSON.stringify(actual)!==JSON.stringify(expected[i]))throw new Error(`Municipality mismatch target=${targetMiB} query=${i}`);
      rows.push({query:i,loadedBytes:result.loadedBytes,chunks:result.chunks,elapsedMs:Math.round((performance.now()-t)*100)/100});
    }
    console.log(JSON.stringify({mode:"HOKKAIDO_POLYGON_PACK_TARGET_COMPARISON",targetMiB,
      chunks:index.chunks.length,maxChunkBytes:Math.max(...index.chunks.map(c=>c.bytes)),
      oversizedChunks:index.chunks.filter(c=>c.oversized).length,
      totalChunkBytes:index.chunks.reduce((s,c)=>s+c.bytes,0),
      indexBytes:Buffer.byteLength(JSON.stringify(index)),equivalenceQueries:queries.length,
      allMunicipalityCodesEqual:true,rows,elapsedMs:Math.round(performance.now()-start),
      limitations:["Eight fixed Hokkaido rectangles only, not nationwide or exhaustive","Local in-memory chunk reads; no Storage HTTP/worker concurrency",
        "Polygon parts not geometrically clipped; target variation is a separate alternative, not z8/z9/z10 clipping"],
      decision:"EXPERIMENT_ONLY_NOT_ADOPTED"}));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
