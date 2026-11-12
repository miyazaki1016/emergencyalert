/** Nationwide read-only JMA >=1mm/h municipality extraction against all 47 official N03 assets.
 * Six z4 tiles cover the Japan geographic envelope; coarse resolution is NOT
 * publication-grade and may include neighboring municipalities.
 * Usage: npx tsx scripts/light-rain-nationwide-live.ts /tmp/n03-local
 */
import { requireCompleteNationwideN03 } from "../lib/weather/rain/lightRainNationwideN03";
import { fetchForecastTargetTimes } from "../lib/weather/providers/jma/targetTimes";
import { buildJmaRainTileUrl } from "../lib/weather/providers/jma/tileUrl";
import { scanJmaTileAtLeast1mm } from "../lib/weather/rain/lightRainProof";
import { municipalitiesForLightRainTile } from "../lib/weather/rain/lightRainMunicipalities";
import type { AdministrativeArea } from "../lib/weather/rain/lightRainAdministrativeAreas";

const root = process.argv[2];
if (!root) throw new Error("Usage: npx tsx scripts/light-rain-nationwide-live.ts <47-prefecture-N03-root>");
const tiles = [[13,5],[14,5],[13,6],[14,6],[13,7],[14,7]] as const;
const stamp = (v:string) => Date.UTC(+v.slice(0,4), +v.slice(4,6)-1, +v.slice(6,8), +v.slice(8,10), +v.slice(10,12));
const tileBounds = (x:number,y:number):[number,number,number,number] => {
  const lon = (u:number) => u/16*360-180;
  const lat = (v:number) => Math.atan(Math.sinh(Math.PI-2*Math.PI*v/16))*180/Math.PI;
  return [lon(x),lat(y+1),lon(x+1),lat(y)];
};
function areaBounds(area:AdministrativeArea):[number,number,number,number] {
  const polygons = area.geometry.type==="Polygon" ? [area.geometry.coordinates as number[][][]] : area.geometry.coordinates as number[][][][];
  let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;
  for (const polygon of polygons) for(const ring of polygon) for(const [x,y] of ring) {
    w=Math.min(w,x);s=Math.min(s,y);e=Math.max(e,x);n=Math.max(n,y);
  }
  return [w,s,e,n];
}
async function tileBuffer(url:string,label:string):Promise<Buffer> {
  for(let i=0;i<3;i++){
    try {
      const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(20000)});
      if(response.ok)return Buffer.from(await response.arrayBuffer());
      if(![404,429,500,502,503,504].includes(response.status))throw new Error("JMA HTTP "+response.status+" "+label);
    } catch(error) {if(i===2)throw error;}
    if(i<2)await new Promise(resolve=>setTimeout(resolve,(i+1)*1500));
  }
  throw new Error("INCOMPLETE_JMA_TILE: "+label);
}
async function main(){
  const coverage=requireCompleteNationwideN03(root);
  const indexed=coverage.areas.map(area=>({area,bounds:areaBounds(area)}));
  const perTile=tiles.map(([x,y])=>{
    const [w,s,e,n]=tileBounds(x,y);
    return {x,y,areas:indexed.filter(({bounds:b})=>b[0]<=e&&b[2]>=w&&b[1]<=n&&b[3]>=s).map(v=>v.area)};
  });
  const now=Date.now();
  const frames=(await fetchForecastTargetTimes()).filter(f=>stamp(f.validtime)>now&&stamp(f.validtime)<=now+30*60000).slice(0,6);
  if(frames.length!==6)throw new Error("INCOMPLETE_JMA_FRAMES: expected six future frames, got "+frames.length);
  const results=[];
  for(const frame of frames){
    const municipalities=new Map<string,{code:string;prefecture:string;municipality:string}>();
    let rainyPixels=0;
    for(const tile of perTile){
      const label=frame.validtime+" z4/"+tile.x+"/"+tile.y;
      const buffer=await tileBuffer(buildJmaRainTileUrl(frame,4,tile.x,tile.y),label);
      const scan=scanJmaTileAtLeast1mm(buffer);
      if(scan.unknownPixels)throw new Error("UNKNOWN_JMA_PALETTE "+label);
      rainyPixels+=scan.rainPixels;
      if(scan.rainPixels)for(const area of municipalitiesForLightRainTile(buffer,4,tile.x,tile.y,tile.areas))municipalities.set(area.code,area);
    }
    results.push({validtime:frame.validtime,rainyPixels,municipalities:[...municipalities.values()].sort((a,b)=>a.code.localeCompare(b.code))});
  }
  console.log(JSON.stringify({mode:"NATIONWIDE_REAL_JMA_OFFICIAL_N03_READ_ONLY",checkedAt:new Date().toISOString(),prefectures:coverage.prefectures,municipalityDatasetSize:coverage.municipalities,tiles:tiles.length,threshold:">=1mm/h",frames:results,precision:"coarse z4; NOT publication-grade; z10 refinement pending",productionWrites:false,blueskyPosts:false}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
