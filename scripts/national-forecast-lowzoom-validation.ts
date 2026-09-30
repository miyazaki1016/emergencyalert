import { PNG } from "pngjs";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { classifyRainPixel } from "../lib/weather/providers/jma/classifyPixel";
import type { RainIntensityClass } from "../lib/weather/types";
import { parentAddress } from "./national-lowzoom-max-rank-proof";

const CZ=4,DZ=8,S=16;
const CT=[[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
const RANK:Record<RainIntensityClass,number>={LT_1:1,"1_TO_5":2,"5_TO_10":3,"10_TO_20":4,"20_TO_30":5,"30_TO_50":6,"50_TO_80":7,GTE_80:8};
const HEAVY=RANK["30_TO_50"];
function rank(p:PNG,x:number,y:number){const i=(y*p.width+x)*4;const c=classifyRainPixel({r:p.data[i],g:p.data[i+1],b:p.data[i+2],a:p.data[i+3]});return c.intensityClass?RANK[c.intensityClass]:0;}
async function mapLimit<T>(a:T[],n:number,fn:(x:T)=>Promise<void>){let i=0;await Promise.all(Array.from({length:n},async()=>{while(true){const j=i++;if(j>=a.length)return;await fn(a[j]);}}));}
async function check(frame:{basetime:string;validtime:string}){
 const coarse=new Map<string,PNG>();for(const [x,y] of CT){const r=await fetch(buildJmaRainTileUrl(frame,CZ,x,y));if(!r.ok)throw new Error(`coarse ${r.status}`);coarse.set(`${x}:${y}`,PNG.sync.read(Buffer.from(await r.arrayBuffer())));}
 const dt:Array<[number,number]>=[];for(const [cx,cy] of CT)for(let dy=0;dy<S;dy++)for(let dx=0;dx<S;dx++)dt.push([cx*S+dx,cy*S+dy]);
 const max=new Map<string,number>();let heavy=0,missed=0,missingDetailTiles=0;
 await mapLimit(dt,Number(process.env.JMA_FORECAST_LOWZOOM_CONCURRENCY??"8"),async([tx,ty])=>{const r=await fetch(buildJmaRainTileUrl(frame,DZ,tx,ty));if(r.status===404){missingDetailTiles++;return;}if(!r.ok)throw new Error(`detail ${tx}/${ty} ${r.status}`);const p=PNG.sync.read(Buffer.from(await r.arrayBuffer()));for(let py=0;py<256;py++)for(let px=0;px<256;px++){const d=rank(p,px,py);const a=parentAddress(tx,ty,px,py);const k=`${a.tileX}:${a.tileY}:${a.pixelX}:${a.pixelY}`;if(d>(max.get(k)??0))max.set(k,d);if(d>=HEAVY){heavy++;const c=coarse.get(`${a.tileX}:${a.tileY}`)!;if(rank(c,a.pixelX,a.pixelY)<HEAVY)missed++;}}});
 let exact=0,below=0,critical=0;for(const [k,m] of max){const [tx,ty,px,py]=k.split(":").map(Number);const c=rank(coarse.get(`${tx}:${ty}`)!,px,py);if(c===m)exact++;if(c<m)below++;if(m>=HEAVY&&c<HEAVY)critical++;}
 return {basetime:frame.basetime,validtime:frame.validtime,detailTiles:dt.length,availableDetailTiles:dt.length-missingDetailTiles,missingDetailTiles,comparedParents:max.size,detailHeavyPixels:heavy,missedHeavyPixels:missed,coarseBelowDetailMax:below,criticalParentMisses:critical,exactMaxMatches:exact,exactRate:max.size?exact/max.size:0,safeOnAvailableTiles:missed===0&&critical===0,maxPoolingOnAvailableTiles:below===0,completeCoverage:missingDetailTiles===0};
}
async function main(){const frames=await fetchForecastTargetTimes();if(!frames.length)throw new Error("No forecast frames");const idx=[0,Math.floor((frames.length-1)/2),frames.length-1].filter((v,i,a)=>a.indexOf(v)===i);const results=[];for(const i of idx)results.push(await check(frames[i]));console.log(JSON.stringify({mode:"FORECAST_LOW_ZOOM_MAX_RANK_VALIDATION",frameCount:frames.length,selectedIndexes:idx,results,allSelectedSafeOnAvailableTiles:results.every(r=>r.safeOnAvailableTiles),allSelectedMaxPoolingOnAvailableTiles:results.every(r=>r.maxPoolingOnAvailableTiles),allSelectedCompleteCoverage:results.every(r=>r.completeCoverage),screeningContractConfirmed:results.every(r=>r.safeOnAvailableTiles&&r.completeCoverage),limitation:"404 detail tiles are recorded as unavailable, never as dry. Comparisons cover all available z8 descendants for nearest/middle/farthest forecast frames. A land-aware proof is required before adopting z4<30 as a universal exclusion rule."}));if(results.some(r=>!r.safeOnAvailableTiles))process.exitCode=2;}
main().catch(e=>{console.error(e);process.exitCode=1;});

// Trigger: rerun forecast low-zoom proof after unavailable-tile handling fix.
