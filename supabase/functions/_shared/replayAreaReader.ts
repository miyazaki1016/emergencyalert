import {Buffer} from 'node:buffer';
import {PNG} from 'npm:pngjs@7.0.0';
import {areaWindow,mosaicWindow,type AreaRequest} from './rainArea.ts';
import {timestamp,type Snapshot} from './rainReplay.ts';
export type AreaCapture={png:Uint8Array;mask:Uint8Array;complete:boolean;metadata:Record<string,unknown>};
export type TileCache=Map<string,{rgba:Uint8Array;sha256:string;bytes:number;fetchedAt:string}>;
export async function sha256(bytes:Uint8Array):Promise<string>{return Buffer.from(await crypto.subtle.digest('SHA-256',Uint8Array.from(bytes).buffer)).toString('hex');}
export async function captureArea(snapshot:Snapshot,request:AreaRequest,index:Set<string>,cache:TileCache=new Map(),fetcher:typeof fetch=fetch):Promise<AreaCapture>{
 const base=timestamp(request.baseTime),valid=timestamp(request.validTime);
 if(base===null||valid===null||base>valid)throw Error('INVALID_AREA_TIME');
 if(request.kind!=='FORECAST'&&(base!==valid||valid>Date.now()||!index.has(request.validTime)))throw Error('AREA_OBSERVATION_NOT_PUBLISHED');
 const window=areaWindow(snapshot.location.latitude,snapshot.location.longitude);
 const tiles=new Map<string,Uint8Array>(),sources:Array<Record<string,unknown>>=[];
 await Promise.all(window.tiles.map(async t=>{
  const url=`https://www.jma.go.jp/bosai/jmatile/data/nowc/${request.baseTime}/none/${request.validTime}/surf/hrpns/10/${t.x}/${t.y}.png`;
  try{
   let tile=cache.get(url);
   if(!tile){
    const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(4000)});
    if(!response.ok)throw Error(`HTTP_${response.status}`);
    const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>2*1024*1024)throw Error('TILE_TOO_LARGE');
    const png=PNG.sync.read(Buffer.from(bytes),{checkCRC:true});if(png.width!==256||png.height!==256)throw Error('TILE_DIMENSIONS');
    tile={rgba:Uint8Array.from(png.data),sha256:await sha256(bytes),bytes:bytes.length,fetchedAt:new Date().toISOString()};
    if(cache.size<48)cache.set(url,tile);
   }
   tiles.set(`${t.x}/${t.y}`,tile.rgba);sources.push({x:t.x,y:t.y,url,sha256:tile.sha256,pngBytes:tile.bytes,fetchedAt:tile.fetchedAt,status:'OK'});
  }catch(e){sources.push({x:t.x,y:t.y,url,status:'MISSING',reason:(e as Error).message});}
 }));
 const cropped=mosaicWindow(window,tiles);
 if(cropped.mask.every(v=>v===0))throw Error('AREA_ALL_TILES_MISSING');
 const png=new PNG({width:window.width,height:window.height});png.data=Buffer.from(cropped.rgba);
 const bytes=Uint8Array.from(PNG.sync.write(png));
 if(bytes.length>16384)throw Error('CROP_SIZE_LIMIT');
 // Verify the encoding is reversible, including alpha and unknown colors.
 if(!Buffer.from(PNG.sync.read(Buffer.from(bytes)).data).equals(Buffer.from(cropped.rgba)))throw Error('CROP_NOT_LOSSLESS');
 const center=((window.centerY-window.originY)*window.width+window.centerX-window.originX),offset=center*4;
 const centerRgba=cropped.mask[center]?{r:cropped.rgba[offset],g:cropped.rgba[offset+1],b:cropped.rgba[offset+2],a:cropped.rgba[offset+3]}:null;
 const expected=request.inputRgba;
 const matchesInputPixel=expected&&centerRgba?['r','g','b','a'].every(k=>expected[k as keyof typeof expected]===centerRgba[k as keyof typeof centerRgba]):null;
 return {png:bytes,mask:cropped.mask,complete:cropped.complete,metadata:{schemaVersion:1,kind:request.kind,baseTime:request.baseTime,validTime:request.validTime,capturedAt:new Date().toISOString(),decidedAt:snapshot.decidedAt,retrieval:'SAME_ISSUANCE_URL_AFTER_DECISION',source:'JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST',attribution:'気象庁公開hrpnsタイルを切り抜いて作成',window,sources:sources.sort((a,b)=>Number(a.y)-Number(b.y)||Number(a.x)-Number(b.x)),centerRgba,matchesInputPixel,rgbaSha256:await sha256(cropped.rgba),pngSha256:await sha256(bytes),maskEncoding:'1=source pixel available,0=missing; transparency is separate'}};
}
