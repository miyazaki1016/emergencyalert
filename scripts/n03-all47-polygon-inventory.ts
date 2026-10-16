// Offline inventory of indivisible N03 polygon parts across all prefectures.
// This does not modify geometry, upload Storage, or select a production target.
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {JAPAN_PREFECTURES} from "../lib/weather/rain/japanPrefectures";
import type {AdministrativeArea} from "../lib/weather/rain/administrativeAreas";
const dir=process.argv[2];if(!dir)throw new Error("Expected prepared N03 directory");
const thresholds=[1048576,1572864,2097152,4194304];
const prefectures=[];let totalParts=0;const totals=thresholds.map(()=>0);
for(const {code,name} of JAPAN_PREFECTURES){
 const areas=JSON.parse(readFileSync(join(dir,code+".areas.json"),"utf8")) as AdministrativeArea[];
 if(!areas.length||areas.some(a=>a.prefecture!==name||!a.code.startsWith(code)))throw new Error("Invalid prefecture "+code);
 const top:{code:string;bytes:number;polygonOrder:number}[]=[];
 const exceed=thresholds.map(()=>0);let parts=0;
 for(const area of areas){
  const polygons=area.geometry.type==="Polygon"?[area.geometry.coordinates]:area.geometry.coordinates;
  for(let i=0;i<polygons.length;i++){
   const bytes=Buffer.byteLength(JSON.stringify({id:0,areaOrder:0,polygonOrder:i,geometry:{type:"Polygon",coordinates:polygons[i]}}))+2;
   parts++;totalParts++;thresholds.forEach((t,k)=>{if(bytes>t){exceed[k]++;totals[k]++}});
   top.push({code:area.code,bytes,polygonOrder:i});
  }
 }
 top.sort((a,b)=>b.bytes-a.bytes);
 prefectures.push({prefecture:code,municipalities:areas.length,parts,overThreshold:exceed,largest:top.slice(0,3)});
}
console.log(JSON.stringify({mode:"N03_ALL47_INDIVISIBLE_POLYGON_INVENTORY",prefectures:prefectures.length,totalParts,thresholdMiB:[1,1.5,2,4],overThresholdTotals:totals,perPrefecture:prefectures,limitations:["Approximate standalone JSON part bytes; actual index/id length may differ","No geometric clipping or municipality equivalence proof","No Production or Storage access"],decision:"EXPERIMENT_ONLY_NOT_ADOPTED"}));
