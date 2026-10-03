import { writeFile } from "node:fs/promises";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";

const CZ=4,DZ=8,S=16;
const CT=[[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
const OUTPUT_PATH=process.env.JMA_404_OUTPUT;

async function mapLimit<T>(items:T[],limit:number,fn:(x:T)=>Promise<void>){
  let next=0;
  await Promise.all(Array.from({length:limit},async()=>{while(true){const i=next++;if(i>=items.length)return;await fn(items[i]);}}));
}

async function main(){
  const frames=await fetchForecastTargetTimes();
  if(!frames.length) throw new Error("No forecast frames");
  const indexes=[0,Math.floor((frames.length-1)/2),frames.length-1].filter((v,i,a)=>a.indexOf(v)===i);
  const out=[];
  const evidence=[];
  for(const index of indexes){
    const frame=frames[index];
    const tiles:Array<[number,number]>=[];
    for(const [cx,cy] of CT) for(let dy=0;dy<S;dy++) for(let dx=0;dx<S;dx++) tiles.push([cx*S+dx,cy*S+dy]);
    const missing:Array<{x:number;y:number;url:string}>=[];
    let ok=0, other=0;
    await mapLimit(tiles,12,async([x,y])=>{
      const url=buildJmaRainTileUrl(frame,DZ,x,y);
      const r=await fetch(url,{cache:"no-store"});
      if(r.ok){ok++;return;}
      if(r.status===404){missing.push({x,y,url});return;}
      other++;
    });
    missing.sort((a,b)=>a.y-b.y||a.x-b.x);
    out.push({index,basetime:frame.basetime,validtime:frame.validtime,total:tiles.length,http200:ok,http404:missing.length,other,first404:missing.slice(0,20)});
    evidence.push({index,basetime:frame.basetime,validtime:frame.validtime,http404:missing.length,missing});
  }
  if(OUTPUT_PATH){
    await writeFile(OUTPUT_PATH,JSON.stringify({mode:"JMA_404_URL_EVIDENCE",coarseZoom:CZ,detailZoom:DZ,frames:evidence},null,2)+"\n","utf8");
  }
  console.log(JSON.stringify({mode:"JMA_404_REPRODUCTION_PROOF",coarseZoom:CZ,detailZoom:DZ,outputPath:OUTPUT_PATH??null,frames:out}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
