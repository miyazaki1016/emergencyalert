import { Buffer } from "node:buffer";
import { PNG } from 'npm:pngjs@7.0.0';
import { timestamp, type Evidence, type Snapshot } from './rainReplay.ts';
export const OBSERVATION_INDEX='https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json';
// Mirrored from lib/weather/providers/jma/pngPalette.ts; parity tested in CI.
export const PALETTE=[['242,242,255,255','LT_1'],['160,210,255,255','1_TO_5'],['33,140,255,255','5_TO_10'],['0,65,255,255','10_TO_20'],['250,245,0,255','20_TO_30'],['255,153,0,255','30_TO_50'],['255,40,0,255','50_TO_80'],['180,0,104,255','GTE_80']];
export function classify(rgba:{r:number;g:number;b:number;a:number}) {
 const intensityClass=PALETTE.find(([key])=>key===`${rgba.r},${rgba.g},${rgba.b},${rgba.a}`)?.[1]??null;
 return {status:rgba.a===0?'NO_RAIN':intensityClass?'RAIN':'UNKNOWN_PIXEL',intensityClass};
}
export function tilePixel(latitude:number,longitude:number) {
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < -85 || latitude > 85 || longitude < -180 || longitude >= 180)throw Error('INVALID_LOCATION');
 const n=1024,x=(longitude+180)/360*n,y=(1-Math.asinh(Math.tan(latitude*Math.PI/180))/Math.PI)/2*n;
 return {zoom:10,tileX:Math.floor(x),tileY:Math.floor(y),pixelX:Math.floor((x-Math.floor(x))*256),pixelY:Math.floor((y-Math.floor(y))*256)};
}
export async function observationIndex(fetcher:typeof fetch=fetch, now=Date.now()):Promise<Set<string>> {
 const response=await fetcher(OBSERVATION_INDEX,{cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('INDEX_FETCH_ERROR');
 const rows=await response.json(); if(!Array.isArray(rows))throw Error('INDEX_INVALID');
 const valid=rows.filter(r=>r?.basetime===r?.validtime&&timestamp(r.validtime)!==null&&timestamp(r.validtime)!<=now&&r.elements?.includes('hrpns')).map(r=>r.validtime as string);
 if(!valid.length || now-Math.max(...valid.map(t=>timestamp(t)!))>20*60000)throw Error('INDEX_STALE');
 return new Set(valid);
}
export async function readObservation(snapshot:Snapshot,validTime:string,index:Set<string>,fetcher:typeof fetch=fetch):Promise<Evidence> {
 if(!index.has(validTime))throw Error('OBSERVATION_NOT_PUBLISHED');
 const p=tilePixel(snapshot.location.latitude,snapshot.location.longitude);
 const url=`https://www.jma.go.jp/bosai/jmatile/data/nowc/${validTime}/none/${validTime}/surf/hrpns/10/${p.tileX}/${p.tileY}.png`;
 const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('TILE_FETCH_ERROR');
 const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>2*1024*1024)throw Error('TILE_TOO_LARGE');
 const png=PNG.sync.read(Buffer.from(bytes),{checkCRC:true});if(png.width!==256||png.height!==256)throw Error('TILE_DIMENSIONS');
 const offset=(p.pixelY*256+p.pixelX)*4;
 const rgba={r:png.data[offset],g:png.data[offset+1],b:png.data[offset+2],a:png.data[offset+3]};
 return {kind:'OBSERVATION',baseTime:validTime,validTime,capturedAt:new Date().toISOString(),...classify(rgba),rgba,debug:p};
}
