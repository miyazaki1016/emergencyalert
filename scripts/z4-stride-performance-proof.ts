/** Read-only JMA Z4 performance benchmark. No DB writes, notifications, or production changes.
 * Uses identical PNG buffers for both stride modes; excludes HTTP/PNG decode from
 * timed classification and reports those costs separately.
 */
import {PNG} from "pngjs";
import {performance} from "node:perf_hooks";
import {fetchObservationTargetTimes} from "../lib/weather/providers/jma/observationTargetTimes";
import {buildJmaRainTileUrl} from "../lib/weather/providers/jma/tileUrl";
import {classifyRainPixel} from "../lib/weather/providers/jma/classifyPixel";
const TILES=[[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
const REPEATS=Number(process.env.Z4_BENCH_REPEATS??"15");
function scan(png:PNG,stride:number){
 let heavy=0;
 for(let y=0;y<png.height;y+=stride)for(let x=0;x<png.width;x+=stride){
  const i=(y*png.width+x)*4;
  const c=classifyRainPixel({r:png.data[i],g:png.data[i+1],b:png.data[i+2],a:png.data[i+3]}).intensityClass;
  if(c==="30_TO_50"||c==="50_TO_80"||c==="GTE_80")heavy++;
 }
 return heavy;
}
async function main(){
 const [frame]=await fetchObservationTargetTimes();
 if(!frame)throw Error("No JMA observation frame");
 const pngs:PNG[]=[];let fetchMs=0,decodeMs=0,compressedBytes=0;
 for(const [x,y] of TILES){
  let t=performance.now();
  const res=await fetch(buildJmaRainTileUrl(frame,4,x,y),{cache:"no-store"});
  if(!res.ok)throw Error("JMA tile unavailable: "+x+","+y+" HTTP "+res.status);
  const raw=Buffer.from(await res.arrayBuffer());fetchMs+=performance.now()-t;
  compressedBytes+=raw.length;t=performance.now();pngs.push(PNG.sync.read(raw));decodeMs+=performance.now()-t;
 }
 const measurements=[];
 for(const stride of [2,1,1,2]){
  const times:number[]=[];const heapBefore=process.memoryUsage();
  let totalHeavy=0,peakRss=heapBefore.rss,peakHeap=heapBefore.heapUsed;
  for(let rep=0;rep<REPEATS;rep++){
   const t=performance.now();let n=0;
   for(const png of pngs)n+=scan(png,stride);
   times.push(performance.now()-t);totalHeavy=n;
   const mem=process.memoryUsage();peakRss=Math.max(peakRss,mem.rss);peakHeap=Math.max(peakHeap,mem.heapUsed);
  }
  times.sort((a,b)=>a-b);
  measurements.push({stride,pixelsPerFrame:6*256*256/(stride*stride),
   detectedHeavyPixels:totalHeavy,repeats:REPEATS,
   medianScanMs:times[Math.floor(times.length/2)],
   minScanMs:times[0],maxScanMs:times[times.length-1],
   heapBeforeBytes:heapBefore.heapUsed,peakHeapUsedBytes:peakHeap,
   rssBeforeBytes:heapBefore.rss,peakRssBytes:peakRss});
 }
 console.log(JSON.stringify({mode:"Z4_STRIDE_BENCH_READ_ONLY",frame:frame.validtime,
  tiles:pngs.length,compressedBytes,fetchMs,decodeMs,
  decodedRGBABytes:pngs.reduce((n,p)=>n+p.data.byteLength,0),
  measurements,caveat:"Memory is process-level high-water RSS/heap (includes loaded PNG and runtime), not per-stride allocation; no GC isolation. Timings classify pixels only, not queue generation or DB."},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
