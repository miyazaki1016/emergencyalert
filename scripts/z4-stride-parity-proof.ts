/**
 * Read-only live JMA Z4 stride=1 vs stride=2 experiment.
 * Usage: npx tsx scripts/z4-stride-parity-proof.ts
 * Requires network access to JMA. Does not write DB or call application APIs.
 */
import { PNG } from "pngjs";
import { fetchObservationTargetTimes } from "../lib/weather/providers/jma/observationTargetTimes";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { classifyRainPixel } from "../lib/weather/providers/jma/classifyPixel";
import { performance } from "node:perf_hooks";
import { scanHeavyRainTile } from "../lib/weather/rain/nationalHeavyRain";
import { stagedRefinementJobsFromCoarseCandidates } from "../lib/weather/rain/nationalRainQueue";

const TILES = [[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
const HEAVY = new Set(["30_TO_50","50_TO_80","GTE_80"]);
const FRAME_LIMIT = Math.max(1,Number(process.env.Z4_FRAME_LIMIT ?? "3"));
const directions = [[-1,0],[1,0],[0,-1],[0,1]] as const;
type Frame = {basetime:string;validtime:string};
async function check(frame:Frame,kind:string) {
  const mask = new Map<string,Uint8Array>();
  let fetched=0, skipped=0, bytes=0;
  const sourceTiles: Array<{x:number;y:number;buffer:Buffer}>=[];
  for(const [tx,ty] of TILES){
    const response=await fetch(buildJmaRainTileUrl(frame,4,tx,ty),{cache:"no-store"});
    if(!response.ok){skipped++;continue;}
    const raw=Buffer.from(await response.arrayBuffer());bytes+=raw.length;
    sourceTiles.push({x:tx,y:ty,buffer:raw});
    const png=PNG.sync.read(raw);
    if(png.width!==256||png.height!==256)throw Error("Unexpected PNG dimensions");
    const m=new Uint8Array(256*256);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const i=(y*256+x)*4;
      const c=classifyRainPixel({r:png.data[i],g:png.data[i+1],b:png.data[i+2],a:png.data[i+3]}).intensityClass;
      if(c&&HEAVY.has(c))m[y*256+x]=1;
    }
    mask.set(tx+":"+ty,m);fetched++;
  }
  // Count 4-connected >=30mm/h components over all 6 Z4 tiles,
  // including connections across tile boundaries.
  const seen=new Set<string>();let all=0,sampled=0,missed=0,components=0,entirelyMissed=0;
  const has=(gx:number,gy:number)=>{const tx=Math.floor(gx/256),ty=Math.floor(gy/256);
    const m=mask.get(tx+":"+ty);return !!m&&m[(gy%256)*256+(gx%256)]===1;};
  for(const [tx,ty] of TILES){
    const m=mask.get(tx+":"+ty);if(!m)continue;
    for(let py=0;py<256;py++)for(let px=0;px<256;px++){
      if(!m[py*256+px])continue;
      const gx=tx*256+px,gy=ty*256+py,k=gx+":"+gy;
      all++;if(px%2===0&&py%2===0)sampled++;else missed++;
      if(seen.has(k))continue;
      components++;let touched=false;const stack:[[number,number]]|Array<[number,number]>=[[gx,gy]];seen.add(k);
      while(stack.length){const [x,y]=stack.pop()!;
        if(x%2===0&&y%2===0)touched=true;
        for(const [dx,dy] of directions){const nx=x+dx,ny=y+dy,nk=nx+":"+ny;
          if(!seen.has(nk)&&has(nx,ny)){seen.add(nk);stack.push([nx,ny]);}}
      }
      if(!touched)entirelyMissed++;
    }
  }
  const bench=[];
  for(const stride of [2,1]){
    const timings:number[]=[];let candidates=[] as ReturnType<typeof scanHeavyRainTile>;
    const memBefore=process.memoryUsage();
    for(let rep=0;rep<8;rep++){
      const start=performance.now();
      candidates=sourceTiles.flatMap(t=>scanHeavyRainTile(t.buffer,4,t.x,t.y,stride));
      timings.push(performance.now()-start);
    }
    const memAfter=process.memoryUsage();
    bench.push({stride,meanScanMs:timings.reduce((a,v)=>a+v,0)/timings.length,
      minScanMs:Math.min(...timings),maxScanMs:Math.max(...timings),
      rssDeltaBytes:memAfter.rss-memBefore.rss,heapDeltaBytes:memAfter.heapUsed-memBefore.heapUsed,
      candidateCount:candidates.length,
      z10JobsInMemory:stagedRefinementJobsFromCoarseCandidates(candidates,frame,10).length,
      z10DistinctTiles:new Set(stagedRefinementJobsFromCoarseCandidates(candidates,frame,10).map(j=>j.tileX+":"+j.tileY)).size,
      z10RepeatedTileJobs:stagedRefinementJobsFromCoarseCandidates(candidates,frame,10).length-new Set(stagedRefinementJobsFromCoarseCandidates(candidates,frame,10).map(j=>j.tileX+":"+j.tileY)).size,
      z10WindowPixelChecks:stagedRefinementJobsFromCoarseCandidates(candidates,frame,10).reduce((s,j)=>s+(j.scanWindow!.maxX-j.scanWindow!.minX+1)*(j.scanWindow!.maxY-j.scanWindow!.minY+1),0),
      z10UniqueWindowPixels:(()=>{const seen=new Set<string>();for(const j of stagedRefinementJobsFromCoarseCandidates(candidates,frame,10)){const w=j.scanWindow!;for(let y=w.minY;y<=w.maxY;y++)for(let x=w.minX;x<=w.maxX;x++)seen.add(j.tileX+":"+j.tileY+":"+x+":"+y);}return seen.size;})()});
  }

  // Isolated decode-parity benchmark: simulate worker's extra PNG.sync.read
  // before scanHeavyRainTile, versus scanHeavyRainTile alone.
  const decodeParity=[];
  for(const stride of [1]){
    const rounds=8;
    const twoDecodeMs:number[]=[];
    const oneDecodeMs:number[]=[];
    let twoCandidates=0,oneCandidates=0,identical=true;
    for(let rep=0;rep<rounds;rep++){
      const run=(doubleDecode:boolean)=>{
        const started=performance.now();
        const candidates=sourceTiles.flatMap(t=>{
          if(doubleDecode)PNG.sync.read(t.buffer);
          return scanHeavyRainTile(t.buffer,4,t.x,t.y,stride);
        });
        return {ms:performance.now()-started,keys:candidates.map(c=>[c.tileX,c.tileY,c.pixelX,c.pixelY,c.intensityClass].join(":")).sort()};
      };
      const first=rep%2===0?run(true):run(false);
      const second=rep%2===0?run(false):run(true);
      const double=rep%2===0?first:second;
      const single=rep%2===0?second:first;
      twoDecodeMs.push(double.ms);oneDecodeMs.push(single.ms);
      twoCandidates=double.keys.length;oneCandidates=single.keys.length;
      if(JSON.stringify(double.keys)!==JSON.stringify(single.keys))identical=false;
    }
    decodeParity.push({stride,rounds,twoDecodeMeanMs:twoDecodeMs.reduce((a,v)=>a+v,0)/rounds,
      oneDecodeMeanMs:oneDecodeMs.reduce((a,v)=>a+v,0)/rounds,
      twoCandidates,oneCandidates,identical});
  }

  // Sample distinct Z6 tiles, not merely the first several windows of one tile.
  // Fetch each distinct image once and evaluate up to three of its original
  // windows; retain each window's detection result independently.
  const z6Sample=[];
  const z4Candidates=sourceTiles.flatMap(t=>scanHeavyRainTile(t.buffer,4,t.x,t.y,1));
  const z6Jobs=stagedRefinementJobsFromCoarseCandidates(z4Candidates,frame,6,4);
  const groups=new Map<string,typeof z6Jobs>();
  for(const job of z6Jobs){
    const key=job.tileX+":"+job.tileY;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key)!.push(job);
  }
  const sampleLimit=Math.max(0,Math.min(6,Number(process.env.Z6_SAMPLE_LIMIT??"3")));
  for(const jobs of [...groups.values()].slice(0,sampleLimit)){
    const job=jobs[0];
    const response=await fetch(buildJmaRainTileUrl(frame,6,job.tileX,job.tileY),{cache:"no-store"});
    if(!response.ok){z6Sample.push({tileX:job.tileX,tileY:job.tileY,httpStatus:response.status});continue;}
    const buffer=Buffer.from(await response.arrayBuffer());
    const windows=[];
    for(const selected of jobs.slice(0,3)){
      const window=selected.scanWindow!;
      const results=[];
      for(const doubleDecode of [true,false]){
        const timings:number[]=[];let keys:string[]=[];
        for(let rep=0;rep<8;rep++){
          const started=performance.now();
          if(doubleDecode)PNG.sync.read(buffer);
          const candidates=scanHeavyRainTile(buffer,6,selected.tileX,selected.tileY,1,window);
          timings.push(performance.now()-started);
          keys=candidates.map(c=>[c.pixelX,c.pixelY,c.intensityClass].join(":")).sort();
        }
        results.push({doubleDecode,meanMs:timings.reduce((a,v)=>a+v,0)/timings.length,keys});
      }
      windows.push({window,twoDecodeMeanMs:results[0].meanMs,oneDecodeMeanMs:results[1].meanMs,
        detected:results[0].keys.length,identical:JSON.stringify(results[0].keys)===JSON.stringify(results[1].keys)});
    }
    z6Sample.push({tileX:job.tileX,tileY:job.tileY,totalWindowsForTile:jobs.length,windows});
  }
  const z6DistinctTiles=groups.size;
  return {kind,validtime:frame.validtime,bench,decodeParity,z6Sample,z6TotalJobs:z6Jobs.length,z6DistinctTiles,fetchedTiles:fetched,unavailableTiles:skipped,
    compressedBytes:bytes,allHeavyPixels:all,stride2HeavyPixels:sampled,
    omittedHeavyPixels:missed,omittedFraction:all?missed/all:null,
    fourConnectedHeavyRegions:components,regionsWithNoStride2Pixel:entirelyMissed,
    complete:fetched===TILES.length};
}
async function main(){
  const start=performance.now();
  const [obs,forecast]=await Promise.all([fetchObservationTargetTimes(),fetchForecastTargetTimes()]);
  const frames=[...obs.slice(0,FRAME_LIMIT).map(frame=>({frame,kind:"observation"})),
    ...forecast.slice(0,FRAME_LIMIT).map(frame=>({frame,kind:"forecast"}))];
  const results=[];for(const {frame,kind} of frames)results.push(await check(frame,kind));
  console.log(JSON.stringify({mode:"Z4_STRIDE_PARITY_READ_ONLY",thresholdMmPerHour:30,
    connectivity:4,frames:results,elapsedMs:Math.round(performance.now()-start),
    caveat:"Missing tiles make counts incomplete; component connectivity is only within fetched tiles. One or several frames do not prove universal safety."},null,2));
  if(results.some(x=>!x.complete))process.exitCode=2;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
