import { PNG } from "pngjs";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";

const COARSE_ZOOM = 4;
const DETAIL_ZOOM = 10;
const SCALE = 2 ** (DETAIL_ZOOM - COARSE_ZOOM); // 64 z10 tiles per z4 tile edge
const COARSE_PIXELS_PER_DETAIL_TILE = 256 / SCALE; // 4 x 4 z4 pixels per z10 tile
const COARSE_TILES = [[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
const SAMPLE_PER_CLASS = Number(process.env.JMA_TILE_EXISTENCE_SAMPLE ?? 100);

type Sample = {
  frameIndex: number;
  basetime: string;
  validtime: string;
  z4x: number;
  z4y: number;
  z10x: number;
  z10y: number;
  coarseOpaquePixels: number;
  coarseTransparentPixels: number;
  expectedClass: "COARSE_HAS_OPAQUE" | "COARSE_ALL_TRANSPARENT";
};

function selectEvenly<T>(items:T[], limit:number):T[] {
  if(items.length <= limit) return items;
  return Array.from({length:limit},(_,i)=>items[Math.floor(i*(items.length-1)/(limit-1))]);
}

function classifyZ10Children(buffer:Buffer, z4x:number, z4y:number, frameIndex:number, basetime:string, validtime:string):Sample[] {
  const png=PNG.sync.read(buffer);
  const out:Sample[]=[];
  if(png.width!==256 || png.height!==256) throw new Error(`unexpected z4 PNG size ${png.width}x${png.height}`);
  for(let cy=0;cy<SCALE;cy++){
    for(let cx=0;cx<SCALE;cx++){
      let opaque=0, transparent=0;
      for(let py=cy*COARSE_PIXELS_PER_DETAIL_TILE;py<(cy+1)*COARSE_PIXELS_PER_DETAIL_TILE;py++){
        for(let px=cx*COARSE_PIXELS_PER_DETAIL_TILE;px<(cx+1)*COARSE_PIXELS_PER_DETAIL_TILE;px++){
          const a=png.data[(py*256+px)*4+3];
          if(a===0) transparent++; else opaque++;
        }
      }
      out.push({
        frameIndex,basetime,validtime,z4x,z4y,
        z10x:z4x*SCALE+cx,z10y:z4y*SCALE+cy,
        coarseOpaquePixels:opaque,
        coarseTransparentPixels:transparent,
        expectedClass:opaque>0?"COARSE_HAS_OPAQUE":"COARSE_ALL_TRANSPARENT",
      });
    }
  }
  return out;
}

async function mapLimit<T,R>(items:T[],limit:number,fn:(x:T)=>Promise<R>):Promise<R[]>{
  const out=new Array<R>(items.length); let next=0;
  await Promise.all(Array.from({length:limit},async()=>{while(true){const i=next++;if(i>=items.length)return;out[i]=await fn(items[i]);}}));
  return out;
}

async function main(){
  const frames=await fetchForecastTargetTimes();
  if(!frames.length) throw new Error("no forecast frames");
  const selectedFrameIndexes=[0,Math.floor((frames.length-1)/2),frames.length-1].filter((v,i,a)=>a.indexOf(v)===i);
  const summaries=[];

  for(const frameIndex of selectedFrameIndexes){
    const frame=frames[frameIndex];
    const children:Sample[]=[];
    let coarse404=0;
    for(const [x,y] of COARSE_TILES){
      const r=await fetch(buildJmaRainTileUrl(frame,COARSE_ZOOM,x,y),{cache:"no-store"});
      if(r.status===404){coarse404++;continue;}
      if(!r.ok) throw new Error(`z4 fetch failed ${frame.validtime} ${x}/${y}: ${r.status}`);
      children.push(...classifyZ10Children(Buffer.from(await r.arrayBuffer()),x,y,frameIndex,frame.basetime,frame.validtime));
    }
    if(coarse404>0){
      summaries.push({frameIndex,basetime:frame.basetime,validtime:frame.validtime,usable:false,coarse404});
      continue;
    }

    const wet=selectEvenly(children.filter(x=>x.expectedClass==="COARSE_HAS_OPAQUE"),SAMPLE_PER_CLASS);
    const dry=selectEvenly(children.filter(x=>x.expectedClass==="COARSE_ALL_TRANSPARENT"),SAMPLE_PER_CLASS);
    const samples=[...wet,...dry];

    const results=await mapLimit(samples,12,async(sample)=>{
      const r=await fetch(buildJmaRainTileUrl(frame,DETAIL_ZOOM,sample.z10x,sample.z10y),{cache:"no-store"});
      if(r.status===404) return {...sample,httpStatus:404,detailOpaquePixels:null,detailTransparentPixels:null,detailAllTransparent:null};
      if(!r.ok) return {...sample,httpStatus:r.status,detailOpaquePixels:null,detailTransparentPixels:null,detailAllTransparent:null};
      const png=PNG.sync.read(Buffer.from(await r.arrayBuffer()));
      let opaque=0,transparent=0;
      for(let i=3;i<png.data.length;i+=4){if(png.data[i]===0)transparent++;else opaque++;}
      return {...sample,httpStatus:200,detailOpaquePixels:opaque,detailTransparentPixels:transparent,detailAllTransparent:opaque===0};
    });

    const summarize=(kind:Sample["expectedClass"])=>{
      const xs=results.filter(x=>x.expectedClass===kind);
      return {
        sampled:xs.length,
        http200:xs.filter(x=>x.httpStatus===200).length,
        http404:xs.filter(x=>x.httpStatus===404).length,
        otherStatus:xs.filter(x=>x.httpStatus!==200&&x.httpStatus!==404).map(x=>x.httpStatus),
        returnedAllTransparent:xs.filter(x=>x.httpStatus===200&&x.detailAllTransparent===true).length,
        returnedMixedTransparentAndOpaque:xs.filter(x=>x.httpStatus===200&&(x.detailOpaquePixels??0)>0&&(x.detailTransparentPixels??0)>0).length,
        returnedFullyOpaque:xs.filter(x=>x.httpStatus===200&&(x.detailOpaquePixels??0)>0&&(x.detailTransparentPixels??0)===0).length,
      };
    };
    summaries.push({
      frameIndex,basetime:frame.basetime,validtime:frame.validtime,usable:true,coarse404:0,
      totalZ10ChildrenRepresented:children.length,
      coarseHasOpaquePopulation:children.filter(x=>x.expectedClass==="COARSE_HAS_OPAQUE").length,
      coarseAllTransparentPopulation:children.filter(x=>x.expectedClass==="COARSE_ALL_TRANSPARENT").length,
      coarseHasOpaque:summarize("COARSE_HAS_OPAQUE"),
      coarseAllTransparent:summarize("COARSE_ALL_TRANSPARENT"),
    });
  }

  console.log(JSON.stringify({
    mode:"JMA_SPARSE_TILE_EXISTENCE_PROOF",
    coarseZoom:COARSE_ZOOM,
    detailZoom:DETAIL_ZOOM,
    selectedFrameIndexes,
    samplePerClass:SAMPLE_PER_CLASS,
    summaries,
    interpretation:"Tests the sparse-file hypothesis: z10 tiles whose corresponding 4x4 z4 pixel block contains any nontransparent precipitation data versus blocks that are fully transparent. HTTP 404 is recorded as unavailable, never as no-rain. A 200 tile is decoded to measure whether it is all-transparent, mixed, or fully opaque.",
    limitation:"z4 is itself an aggregated product, so this measures observed correspondence rather than proving JMA's internal file-generation rule. Repeated runs across weather regimes are needed before treating sparse-file behavior as a contract.",
  }));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
