import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assignRegions, ownedTasks, gatherOwnedResults } from './national-region-ownership';
import { partitionAreas } from './n03-partition-design-core';
import { municipalitiesForNationalRainFootprint } from '../lib/weather/rain/nationalRainMunicipalities';
import { N03_PREFECTURE_INDEX_2026 } from '../lib/weather/rain/n03PrefectureIndex2026';
import type {HeavyRainPolygon} from '../lib/weather/rain/nationalHeavyRain';
import type { AdministrativeArea } from '../lib/weather/rain/administrativeAreas';
import { tileFootprint } from './n03-readiness-common';
const [root,code] = process.argv.slice(2);
const areas: AdministrativeArea[]=JSON.parse(readFileSync(join(root,`${code}.areas.json`),'utf8'));
const {index,files}=partitionAreas(areas);
const chunks=index.chunks.map(c=>({code,file:c.file,bytes:c.bytes}));
const ownership=assignRegions(chunks,8);
const pref=N03_PREFECTURE_INDEX_2026.find(p=>p.code===code)!;
const [w,s,e,n]=pref.bbox;
const box=(w:number,s:number,e:number,n:number):HeavyRainPolygon[]=>[{type:'Polygon' as const,coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}];
const tile=(lon:number,lat:number)=>[Math.floor((lon+180)/360*256),Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*256)];
const nw=tile(w,n),se=tile(e,s);
const queries=[box(w,s,e,n),box(w,s,w,n),box(e,s,e,n)];
// All bbox tiles include county boundaries, cross-prefecture tiles and remote islands.
for(let y=nw[1];y<=se[1];y++) for(let x=nw[0];x<=se[0];x++) queries.push(tileFootprint(x,y));
let positive=0;
for(let q=0;q<queries.length;q++) {
  const rain=queries[q],tasks=ownedTasks(`q${q}`,chunks,ownership);
  const rows=tasks.map(t=>{
    const parts=JSON.parse(files.get(t.chunkKey.split('/')[1])!);
    const selected=parts.map((p: {areaOrder:number;geometry:AdministrativeArea['geometry']})=>({...index.areas[p.areaOrder],geometry:p.geometry}));
    return {key:t.key,municipalities:municipalitiesForNationalRainFootprint(rain,selected)};
  }).reverse(); // deliberately out of worker completion order
  const actual=gatherOwnedResults(tasks.map(t=>t.key),rows,areas.map(a=>a.code));
  const expected=municipalitiesForNationalRainFootprint(rain,areas);
  if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error(`Ownership mismatch ${code}/${q}`);
  positive+=Number(expected.length>0);
}
const report={code,chunks,queries:queries.length,positive,exactOrderedEquivalence:true,peakRssMiB:process.resourceUsage().maxRSS/1024};
writeFileSync(join(root,`${code}.ownership.json`),JSON.stringify(report));
console.log(JSON.stringify({...report,chunks:chunks.length}));
