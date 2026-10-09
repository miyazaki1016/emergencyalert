// Offline real chunk resolver comparison; no Storage access.
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {affectedAdministrativeAreas} from "../lib/weather/rain/administrativeAreas";
import type {AdministrativeArea} from "../lib/weather/rain/administrativeAreas";
import type {HeavyRainPolygon} from "../lib/weather/rain/nationalHeavyRain";
import {partitionAreas,resolvePartitionedFootprint} from "./n03-partition-design-core";
const [sourceDir,clippedDir]=process.argv.slice(2);
if(!sourceDir||!clippedDir)throw new Error("Expected source and clipped directories");
const rectangle=(w:number,s:number,e:number,n:number):HeavyRainPolygon[]=>[{type:"Polygon",coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}];
const polygons=(a:AdministrativeArea)=>a.geometry.type==="Polygon"?[a.geometry.coordinates as number[][][]]:a.geometry.coordinates as number[][][][];
let queries=0,mismatches=0,loadedBytes=0;const samples:unknown[]=[];
async function main(){
 for(let p=1;p<=47;p++){
  const pref=String(p).padStart(2,"0");
  const source=JSON.parse(readFileSync(join(sourceDir,pref+".areas.json"),"utf8")) as AdministrativeArea[];
  const targets=source.filter(a=>polygons(a).some(coordinates=>Buffer.byteLength(JSON.stringify({type:"Polygon",coordinates}))>1572864));
  if(!targets.length)continue;
  const clipped=JSON.parse(readFileSync(join(clippedDir,pref+".areas.json"),"utf8")) as AdministrativeArea[];
  const {index,files}=partitionAreas(clipped,1572864);
  if(index.chunks.some(c=>c.oversized))throw new Error("Oversized clipped partition "+pref);
  for(const area of targets){
   const big=polygons(area).find(coordinates=>Buffer.byteLength(JSON.stringify({type:"Polygon",coordinates}))>1572864)!;
   let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;
   for(const ring of big)for(const [x,y] of ring){w=Math.min(w,x);s=Math.min(s,y);e=Math.max(e,x);n=Math.max(n,y)}
   const dx=e-w,dy=n-s;
   const tests=[rectangle(w,s,e,n),rectangle(w+dx*.49,s+dy*.49,w+dx*.51,s+dy*.51),rectangle(w-dx*.02,s-dy*.02,w+dx*.02,s+dy*.02)];
   for(let i=0;i<tests.length;i++){
    const expected=affectedAdministrativeAreas(tests[i],source).map(a=>a.code);
    const resolved=await resolvePartitionedFootprint(tests[i],index,async file=>Buffer.from(files.get(file)??""));
    const actual=resolved.municipalities.map(a=>a.code);
    queries++;loadedBytes+=resolved.loadedBytes;
    if(JSON.stringify(expected)!==JSON.stringify(actual)){mismatches++;if(samples.length<10)samples.push({pref,code:area.code,case:i,expected,actual})}
   }
  }
 }
 console.log(JSON.stringify({mode:"N03_CLIPPED_PARTITION_RESOLVER_EQUIVALENCE",queries,mismatches,loadedBytes,samples,limitations:["Only three rectangle probes per oversized source Polygon","In-memory chunks with SHA validation; not remote Storage","Not exhaustive for holes or exact clipping-grid contact"],decision:"EXPERIMENT_ONLY_NOT_ADOPTED"}));
 if(mismatches)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
