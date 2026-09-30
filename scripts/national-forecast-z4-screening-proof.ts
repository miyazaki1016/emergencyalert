import { PNG } from "pngjs";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { classifyRainPixel } from "../lib/weather/providers/jma/classifyPixel";
import { refinementJobFromCoarseCandidate } from "../lib/weather/rain/nationalRainQueue";
import type { RainIntensityClass } from "../lib/weather/types";

const Z=4, DETAIL_Z=8;
const TILES=[[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
const RANK:Record<RainIntensityClass,number>={LT_1:1,"1_TO_5":2,"5_TO_10":3,"10_TO_20":4,"20_TO_30":5,"30_TO_50":6,"50_TO_80":7,GTE_80:8};
const HEAVY=RANK["30_TO_50"];

function scan(buf:Buffer,tx:number,ty:number){
  const png=PNG.sync.read(buf); const out:{tileX:number;tileY:number;pixelX:number;pixelY:number;rank:number;cls:RainIntensityClass}[]=[];
  for(let py=0;py<png.height;py++)for(let px=0;px<png.width;px++){
    const i=(py*png.width+px)*4;
    const c=classifyRainPixel({r:png.data[i],g:png.data[i+1],b:png.data[i+2],a:png.data[i+3]});
    if(!c.intensityClass)continue; const rank=RANK[c.intensityClass];
    if(rank>=HEAVY) out.push({tileX:tx,tileY:ty,pixelX:px,pixelY:py,rank,cls:c.intensityClass});
  }
  return out;
}

async function main(){
  const frames=await fetchForecastTargetTimes();
  if(!frames.length) throw new Error("No forecast frames");
  const rows=[];
  let totalHeavy=0,totalRefine=0;
  for(const frame of frames){
    const candidates=(await Promise.all(TILES.map(async([x,y])=>{
      const r=await fetch(buildJmaRainTileUrl(frame,Z,x,y),{cache:"no-store"});
      if(!r.ok) throw new Error(`z4 fetch failed ${frame.validtime} ${x}/${y}: ${r.status}`);
      return scan(Buffer.from(await r.arrayBuffer()),x,y);
    }))).flat();
    const refine=new Set(candidates.map(c=>{
      const j=refinementJobFromCoarseCandidate(c,frame,Z,DETAIL_Z);
      return `${j.tileX}:${j.tileY}`;
    }));
    const counts=Object.fromEntries(["30_TO_50","50_TO_80","GTE_80"].map(k=>[k,candidates.filter(c=>c.cls===k).length]));
    totalHeavy+=candidates.length; totalRefine+=refine.size;
    rows.push({basetime:frame.basetime,validtime:frame.validtime,heavyParentPixels:candidates.length,refinementTiles:refine.size,counts});
  }
  const naive=frames.length*TILES.length*256; // 6 coarse tiles x 256 z8 descendant tiles each
  console.log(JSON.stringify({
    mode:"FORECAST_Z4_SCREENING_DISCOVERY",
    frames:frames.length,
    rows,
    totalHeavyParentPixels:totalHeavy,
    totalRefinementTiles:totalRefine,
    naiveAllZ8Tiles:naive,
    avoidedZ8Tiles:naive-totalRefine,
    reductionRate:naive?1-totalRefine/naive:0,
    note:"Discovery only: counts z4>=30 candidates and the exact z8 tiles they map to. Safety still requires exhaustive parent/descendant validation on forecast frames."
  }));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
