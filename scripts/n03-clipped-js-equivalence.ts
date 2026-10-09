// Offline comparison of canonical JS rain/municipality matches before and after clipping.
// Focuses on all municipalities whose source polygons exceeded the 1.5MiB cap.
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {affectedAdministrativeAreas} from "../lib/weather/rain/administrativeAreas";
import type {AdministrativeArea} from "../lib/weather/rain/administrativeAreas";
import type {HeavyRainPolygon} from "../lib/weather/rain/nationalHeavyRain";
const [originalDir,clippedDir]=process.argv.slice(2);
if(!originalDir||!clippedDir)throw new Error("Expected original and clipped N03 directories");
function rectangle(w:number,s:number,e:number,n:number):HeavyRainPolygon[]{
 return [{type:"Polygon",coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}];
}
function bounds(area:AdministrativeArea):[number,number,number,number]{
 let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;
 const polys=area.geometry.type==="Polygon"?[area.geometry.coordinates as number[][][]]:area.geometry.coordinates as number[][][][];
 for(const poly of polys)for(const ring of poly)for(const [x,y] of ring){w=Math.min(w,x);s=Math.min(s,y);e=Math.max(e,x);n=Math.max(n,y)}
 return [w,s,e,n];
}
const targets=new Map<string,Set<string>>();
for(let p=1;p<=47;p++){
 const code=String(p).padStart(2,"0");
 const areas=JSON.parse(readFileSync(join(originalDir,code+".areas.json"),"utf8")) as AdministrativeArea[];
 for(const area of areas){
  const polys=area.geometry.type==="Polygon"?[area.geometry.coordinates as number[][][]]:area.geometry.coordinates as number[][][][];
  if(polys.some(coordinates=>Buffer.byteLength(JSON.stringify({geometry:{type:"Polygon",coordinates}}))>1572864)){
   if(!targets.has(code))targets.set(code,new Set());targets.get(code)!.add(area.code);
  }
 }
}
let queries=0,mismatches=0;const samples:unknown[]=[];let boundaryCases=0,holeCases=0;
for(const [pref,codes] of targets){
 const before=(JSON.parse(readFileSync(join(originalDir,pref+".areas.json"),"utf8")) as AdministrativeArea[]).filter(a=>codes.has(a.code));
 const after=(JSON.parse(readFileSync(join(clippedDir,pref+".areas.json"),"utf8")) as AdministrativeArea[]).filter(a=>codes.has(a.code));
 if(before.length!==after.length)throw new Error("Missing municipality "+pref);
 for(const area of before){
  const [w,s,e,n]=bounds(area),dx=e-w,dy=n-s;
  const cases=[rectangle(w,s,e,n),rectangle(w-dx*.1,s-dy*.1,w-dx*.01,s-dy*.01),rectangle(w+dx*.48,s+dy*.48,w+dx*.52,s+dy*.52)];
  for(const x of [0.1,0.5,0.9])for(const y of [0.1,0.5,0.9]){
   const cx=w+dx*x,cy=s+dy*y;
   cases.push(rectangle(cx-dx*.005,cy-dy*.005,cx+dx*.005,cy+dy*.005));
  }
  // Adversarial probes: zero-margin rectangles at source boundary vertices,
  // clipped fragment vertices, and interior rings (holes). This is a sampled
  // regression probe, not an exhaustive topology equivalence proof.
  const sourcePolys=area.geometry.type==="Polygon"?[area.geometry.coordinates as number[][][]]:area.geometry.coordinates as number[][][][];
  const clippedArea=after.find(a=>a.code===area.code)!;
  const clippedPolys=clippedArea.geometry.type==="Polygon"?[clippedArea.geometry.coordinates as number[][][]]:clippedArea.geometry.coordinates as number[][][][];
  const tiny=Math.max(Math.min(dx,dy)*1e-7,1e-9);
  for(const polys of [sourcePolys,clippedPolys]){
   const candidates=polys.filter(p=>p[0]?.length>1000).slice(0,2);
   for(const poly of candidates){
    const ring=poly[0];
    for(const k of [0,Math.floor(ring.length/3),Math.floor(ring.length*2/3)]){
     const [x,y]=ring[k];cases.push(rectangle(x-tiny,y-tiny,x+tiny,y+tiny));boundaryCases++;
    }
   }
  }
  for(const poly of sourcePolys.filter(p=>p.length>1).slice(0,2)){
   for(const ring of poly.slice(1,3)){
    const [x,y]=ring[0];cases.push(rectangle(x-tiny,y-tiny,x+tiny,y+tiny));holeCases++;
   }
  }
  for(let i=0;i<cases.length;i++){
   const expected=affectedAdministrativeAreas(cases[i],[area]).length>0;
   const actual=affectedAdministrativeAreas(cases[i],after.filter(a=>a.code===area.code)).length>0;
   queries++;
   if(expected!==actual){mismatches++;if(samples.length<10)samples.push({pref,code:area.code,case:i,expected,actual})}
  }
 }
}
console.log(JSON.stringify({mode:"N03_CLIPPED_JS_MUNICIPALITY_EQUIVALENCE",municipalities:[...targets.values()].reduce((n,x)=>n+x.size,0),queries,boundaryCases,holeCases,mismatches,samples,limitations:["Fixed bbox-relative rectangles only; not exhaustive","Does not exercise partition resolver or chunk IO","Boundary and hole probes are sampled only; exact clipping-grid contact and topology remain unproven"],decision:"EXPERIMENT_ONLY_NOT_ADOPTED"}));
if(mismatches)process.exitCode=1;
