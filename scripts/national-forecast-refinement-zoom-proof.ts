import { PNG } from "pngjs";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { classifyRainPixel } from "../lib/weather/providers/jma/classifyPixel";
import type { RainIntensityClass } from "../lib/weather/types";

const COARSE_ZOOM=4;
const ZOOMS=[5,6,7,8,9,10];
const TILES=[[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
const RANK:Record<RainIntensityClass,number>={LT_1:1,"1_TO_5":2,"5_TO_10":3,"10_TO_20":4,"20_TO_30":5,"30_TO_50":6,"50_TO_80":7,GTE_80:8};
const HEAVY=RANK["30_TO_50"];

type Candidate={tileX:number;tileY:number;pixelX:number;pixelY:number};

function scan(buf:Buffer,tx:number,ty:number):Candidate[]{
  const png=PNG.sync.read(buf); const out:Candidate[]=[];
  for(let py=0;py<png.height;py++)for(let px=0;px<png.width;px++){
    const i=(py*png.width+px)*4;
    const c=classifyRainPixel({r:png.data[i],g:png.data[i+1],b:png.data[i+2],a:png.data[i+3]});
    if(c.intensityClass && RANK[c.intensityClass]>=HEAVY) out.push({tileX:tx,tileY:ty,pixelX:px,pixelY:py});
  }
  return out;
}

function descendantTile(c:Candidate,zoom:number){
  const scale=2**(zoom-COARSE_ZOOM);
  if(scale>256) throw new Error("unsupported zoom ratio");
  const cell=256/scale;
  return {
    x:c.tileX*scale+Math.floor(c.pixelX/cell),
    y:c.tileY*scale+Math.floor(c.pixelY/cell),
  };
}

async function mapLimit<T>(items:T[],limit:number,fn:(v:T)=>Promise<void>){
  let next=0;
  await Promise.all(Array.from({length:limit},async()=>{while(true){const i=next++;if(i>=items.length)return;await fn(items[i]);}}));
}

async function main(){
  const frames=await fetchForecastTargetTimes();
  const rows=[];
  for(const frame of frames){
    const candidates=(await Promise.all(TILES.map(async([x,y])=>{
      const r=await fetch(buildJmaRainTileUrl(frame,COARSE_ZOOM,x,y),{cache:"no-store"});
      if(!r.ok) throw new Error(`coarse fetch failed ${frame.validtime} ${x}/${y}: ${r.status}`);
      return scan(Buffer.from(await r.arrayBuffer()),x,y);
    }))).flat();

    const zooms=[] as Array<{zoom:number;requested:number;ok:number;missing404:number;otherErrors:number;allRequestedAvailable:boolean}>;
    for(const zoom of ZOOMS){
      const unique=new Map<string,{x:number;y:number}>();
      for(const c of candidates){const d=descendantTile(c,zoom);unique.set(`${d.x}:${d.y}`,d);}
      let ok=0,missing404=0,otherErrors=0;
      await mapLimit([...unique.values()],8,async({x,y})=>{
        const r=await fetch(buildJmaRainTileUrl(frame,zoom,x,y),{cache:"no-store"});
        if(r.ok) ok++; else if(r.status===404) missing404++; else otherErrors++;
      });
      zooms.push({zoom,requested:unique.size,ok,missing404,otherErrors,allRequestedAvailable:unique.size===ok});
    }
    const fullyAvailable=zooms.filter(z=>z.allRequestedAvailable).map(z=>z.zoom);
    rows.push({
      basetime:frame.basetime,
      validtime:frame.validtime,
      coarseHeavyPixels:candidates.length,
      zooms,
      highestFullyAvailableCandidateZoom:fullyAvailable.length?Math.max(...fullyAvailable):null,
    });
  }
  console.log(JSON.stringify({
    mode:"FORECAST_CANDIDATE_REFINEMENT_ZOOM_PROOF",
    frameCount:frames.length,
    rows,
    note:"Availability is measured only for descendant tiles selected by z4 >=30 mm/h candidates. A 404 is unavailable, never no-rain. This identifies practical per-horizon refinement zooms; it does not by itself prove that z4<30 cannot hide heavier detail.",
  }));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
