// Local-only design experiment; never uses a Supabase client or mutates Storage.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { PNG } from "pngjs";
import { measureWorker } from "./national-rain-throughput-harness";
import { parseN03FeatureCollection, type N03FeatureCollection } from "../lib/weather/rain/n03AdministrativeAreas";
import { municipalitiesForNationalRainFootprint } from "../lib/weather/rain/nationalRainMunicipalities";
import type { AdministrativeArea } from "../lib/weather/rain/administrativeAreas";
import type { HeavyRainPolygon } from "../lib/weather/rain/nationalHeavyRain";
import { N03_PREFECTURE_INDEX_2026 } from "../lib/weather/rain/n03PrefectureIndex2026";
import { partitionAreas, resolvePartitionedFootprint, sha256, type PartitionIndex } from "./n03-partition-design-core";

function tileRain(x:number,y:number): HeavyRainPolygon[] {
  const coordinate=(x:number,y:number):[number,number]=>[x/256*360-180,Math.atan(Math.sinh(Math.PI-2*Math.PI*y/256))*180/Math.PI];
  return [{type:"Polygon",coordinates:[[coordinate(x,y),coordinate(x+1,y),coordinate(x+1,y+1),coordinate(x,y+1),coordinate(x,y)]]}];
}
const pref=N03_PREFECTURE_INDEX_2026.find(p=>p.code==="01")!;
function queries() {
  const tile=(lon:number,lat:number)=>({x:Math.floor((lon+180)/360*256),y:Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*256)});
  const nw=tile(pref.bbox[0],pref.bbox[3]),se=tile(pref.bbox[2],pref.bbox[1]);
  const result=[{key:"stress-228-94",rain:tileRain(228,94)}];
  for(let y=nw.y;y<=se.y;y++) for(let x=nw.x;x<=se.x;x++) result.push({key:`tile-${x}-${y}`,rain:tileRain(x,y)});
  result.push({key:"whole-prefecture",rain:[{type:"Polygon",coordinates:[[[pref.bbox[0],pref.bbox[1]],[pref.bbox[2],pref.bbox[1]],[pref.bbox[2],pref.bbox[3]],[pref.bbox[0],pref.bbox[3]],[pref.bbox[0],pref.bbox[1]]]]}]});
  return result;
}
async function main() {
  const [mode,root,source]=process.argv.slice(2);
  if (!root || !["prepare","prepare-prepared","full","partitioned","compare","worker-1","worker-4"].includes(mode)) throw new Error("usage: proof prepare/prepare-prepared <root> <source> | full/partitioned/compare/worker-1/worker-4 <root>");
  if (mode.startsWith("worker-")) {
    const index:PartitionIndex=JSON.parse(readFileSync(join(root,"index.json"),"utf8"));
    const png=new PNG({width:256,height:256});
    for(let i=0;i<png.data.length;i+=4) { png.data[i]=255;png.data[i+1]=40;png.data[i+2]=0;png.data[i+3]=255; }
    const body=PNG.sync.write(png);
    // Proof admission policy: only one N03 resolver can decode chunks at a
    // time across all jobs. No decoded geometry retained between jobs.
    let tail:Promise<void>=Promise.resolve();let reads=0,bytes=0;
    const resolveMunicipalities=(rain:HeavyRainPolygon[])=>{
      const pending=tail.then(async()=>{
        const result=await resolvePartitionedFootprint(rain,index,file=>readFile(join(root,file)));
        reads+=result.chunks;bytes+=result.loadedBytes;
        return result.municipalities;
      });
      tail=pending.then(()=>undefined,()=>undefined);
      return pending;
    };
    const z8Tile={x:228,y:94};
    const jobs=Array.from({length:50},(_,i)=>({id:i+1,run_key:`partition-design-${i}`,basetime:"20260930060000",validtime:"20260930060500",zoom:10,tile_x:z8Tile.x*4,tile_y:z8Tile.y*4}));
    const measured=await measureWorker({jobs,concurrency:Number(mode.slice(-1)),fetcher:async()=>new Response(new Uint8Array(body)),resolveMunicipalities});
    if (!measured.result.done || measured.result.failed || !measured.municipalityHits) throw new Error("Expected positive exact Hokkaido municipality intersections for completed z10 jobs");
    console.log(JSON.stringify({mode:"HOKKAIDO_PARTITION_ACTUAL_WORKER_LOCAL_PROOF",admission:"one N03 resolver per invocation; serial chunks; no geometry cache",reads,bytes,...measured,limitations:[...measured.limitations,"Synthetic repeated dense PNG and local chunk IO; no JMA/Storage HTTP", "Prototype manifest is locally generated; not an application loader"],schedulerDecision:"NOT_PRODUCTION_READY"}));return;
  }
  if (mode==="compare") {
    const full=JSON.parse(readFileSync(join(root,"full-report.json"),"utf8"));
    const partitioned=JSON.parse(readFileSync(join(root,"partitioned-report.json"),"utf8"));
    if (full.rows.length!==queries().length || partitioned.rows.length!==full.rows.length) throw new Error("Query count mismatch");
    full.rows.forEach((row: {key:string;municipalities:unknown},i:number)=>{
      if (row.key!==partitioned.rows[i].key || JSON.stringify(row.municipalities)!==JSON.stringify(partitioned.rows[i].municipalities)) throw new Error(`Ordered municipality mismatch: ${row.key}`);
    });
    console.log(JSON.stringify({mode:"HOKKAIDO_PARTITION_EQUIVALENCE",queries:full.rows.length,orderedMunicipalityResultsEqual:true}));return;
  }
  if (mode==="prepare" || mode==="prepare-prepared") {
    if (!source) throw new Error("Source required");
    const input=JSON.parse(readFileSync(source,"utf8"));
    const areas:AdministrativeArea[]=mode==="prepare" ? parseN03FeatureCollection(input as N03FeatureCollection).filter(a=>a.prefecture===pref.name) : input;
    if (!Array.isArray(areas) || !areas.length || areas.some(a=>a.prefecture!==pref.name)) throw new Error("Expected only Hokkaido prepared areas");
    const body=JSON.stringify(areas);mkdirSync(root,{recursive:true});writeFileSync(join(root,"01.areas.json"),body);
    const {index,files}=partitionAreas(areas);
    for (const [file,content] of files) writeFileSync(join(root,file),content);
    const indexBody=JSON.stringify(index);writeFileSync(join(root,"index.json"),indexBody);
    const reconstruction=areas.map(a=>({code:a.code,prefecture:a.prefecture,municipality:a.municipality,geometry:{type:"MultiPolygon",coordinates:[] as number[][][][]}}));
    for (const content of files.values()) for(const part of JSON.parse(content)) reconstruction[part.areaOrder].geometry.coordinates[part.polygonOrder]=part.geometry.coordinates;
    areas.forEach((a,i)=>{
      const polygons=a.geometry.type==="Polygon"?[a.geometry.coordinates]:a.geometry.coordinates;
      if (JSON.stringify(polygons)!==JSON.stringify(reconstruction[i].geometry.coordinates)) throw new Error("Exact coordinate reconstruction mismatch");
    });
    const stats={mode:"HOKKAIDO_PARTITION_DESIGN_PREPARATION",sourceSha256:sha256(readFileSync(source)),preparedSha256:sha256(body),preparedBytes:Buffer.byteLength(body),municipalities:areas.length,polygonParts:index.parts.length,indexBytes:Buffer.byteLength(indexBody),chunks:index.chunks.length,totalChunkBytes:index.chunks.reduce((s,c)=>s+c.bytes,0),maxChunkBytes:Math.max(...index.chunks.map(c=>c.bytes)),oversizedChunks:index.chunks.filter(c=>c.oversized).length,exactCoordinateReconstruction:true};
    writeFileSync(join(root,"preparation.json"),JSON.stringify(stats));console.log(JSON.stringify(stats));return;
  }
  const started=performance.now();
  let areas:AdministrativeArea[]=[];let index:PartitionIndex|undefined;
  if(mode==="full") areas=JSON.parse(readFileSync(join(root,"01.areas.json"),"utf8"));
  else index=JSON.parse(readFileSync(join(root,"index.json"),"utf8"));
  const loadedAt=performance.now();const afterLoad=process.memoryUsage();
  const rows=[];
  for(const query of queries()) {
    const one=performance.now();
    if(mode==="full") rows.push({key:query.key,municipalities:municipalitiesForNationalRainFootprint(query.rain,areas),elapsedMs:performance.now()-one});
    else rows.push({key:query.key,...await resolvePartitionedFootprint(query.rain,index!,file=>readFile(join(root,file))),elapsedMs:performance.now()-one});
  }
  const report={mode:"HOKKAIDO_N03_ONLY_DESIGN_PROOF",variant:mode,loadMs:loadedAt-started,afterLoadRssMiB:afterLoad.rss/1048576,afterLoadHeapUsedMiB:afterLoad.heapUsed/1048576,elapsedMs:performance.now()-started,processMaxRssMiB:process.resourceUsage().maxRSS/1024,queries:rows.length,rows,limitations:["Local Node/filesystem; not Production Storage HTTP or Vercel", "N03-only phase; cannot be subtracted from prior worker peak", "No geometry cache; repeated-query IO/caching tradeoff remains", "Serial chunk evaluation; no concurrency=4 memory guarantee"]};
  writeFileSync(join(root,`${mode}-report.json`),JSON.stringify(report));
  console.log(JSON.stringify({...report,rows:undefined,stress:rows[0]}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
