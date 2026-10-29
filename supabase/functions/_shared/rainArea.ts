import { requiredTimes, timestamp, type Snapshot, type Frame } from './rainReplay.ts';
export type AreaKind='FORECAST'|'INPUT_OBSERVATION'|'OBSERVATION';
export type AreaRequest={kind:AreaKind;baseTime:string;validTime:string;inputRgba:Frame['rgba']};
export type WindowSpec={zoom:10;originX:number;originY:number;width:number;height:number;centerX:number;centerY:number;radiusMeters:1000;metersPerPixel:number;tiles:Array<{x:number;y:number}>};
export function areaKey(r:AreaRequest){return `${r.kind}/${r.baseTime}/${r.validTime}`;}
export function areaPlan(snapshot:Snapshot):AreaRequest[]{
 const times=requiredTimes(snapshot),wanted=new Set(times),decided=timestamp(snapshot.decidedAt);
 if(!times.length||decided===null)return [];
 const result:AreaRequest[]=[];
 const add=(kind:AreaKind,f:Frame)=>{
  const b=timestamp(f.baseTime),v=timestamp(f.validTime);
  if(b===null||v===null||b>v||b>decided||!/^\d{14}$/.test(f.baseTime??'')||!/^\d{14}$/.test(f.validTime??''))return;
  if(kind==='INPUT_OBSERVATION'&&b!==v)return;
  result.push({kind,baseTime:f.baseTime!,validTime:f.validTime!,inputRgba:f.rgba??null});
 };
 for(const f of snapshot.forecast)if(wanted.has(f.validTime??''))add('FORECAST',f);
 for(const f of snapshot.observation.slice(0,2))add('INPUT_OBSERVATION',f);
 for(const time of times)result.push({kind:'OBSERVATION',baseTime:time,validTime:time,inputRgba:null});
 return [...new Map(result.map(r=>[areaKey(r),r])).values()].slice(0,20);
}
/** Conservative square covering a 1-km circle. The outermost source pixels are retained. */
export function areaWindow(latitude:number,longitude:number):WindowSpec{
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>60||longitude< -180||longitude>=180)throw Error('UNSUPPORTED_AREA_LOCATION');
 const scale=256*1024,rad=latitude*Math.PI/180;
 const worldX=(longitude+180)/360*scale,worldY=(1-Math.asinh(Math.tan(rad))/Math.PI)/2*scale;
 const centerX=Math.floor(worldX),centerY=Math.floor(worldY);
 const metersPerPixel=156543.03392804097*Math.cos(rad)/1024;
 const radius=Math.ceil(1000/metersPerPixel)+1;
 const originX=centerX-radius,originY=centerY-radius,width=radius*2+1,height=width;
 if(originX<0||originY<0||originX+width>scale||originY+height>scale)throw Error('AREA_WORLD_BOUNDARY');
 const tiles:WindowSpec['tiles']=[];
 for(let y=Math.floor(originY/256);y<=Math.floor((originY+height-1)/256);y++)for(let x=Math.floor(originX/256);x<=Math.floor((originX+width-1)/256);x++)tiles.push({x,y});
 if(tiles.length>4)throw Error('AREA_TILE_LIMIT');
 return {zoom:10,originX,originY,width,height,centerX,centerY,radiusMeters:1000,metersPerPixel,tiles};
}
export function mosaicWindow(window:WindowSpec,tiles:Map<string,Uint8Array>){
 const rgba=new Uint8Array(window.width*window.height*4),mask=new Uint8Array(window.width*window.height);
 for(let y=0;y<window.height;y++)for(let x=0;x<window.width;x++){
  const wx=window.originX+x,wy=window.originY+y,tx=Math.floor(wx/256),ty=Math.floor(wy/256),tile=tiles.get(`${tx}/${ty}`);
  const dest=y*window.width+x;if(!tile)continue;
  if(tile.length!==256*256*4)throw Error('INVALID_TILE_RGBA');
  const source=((wy%256)*256+(wx%256))*4;
  rgba.set(tile.subarray(source,source+4),dest*4);mask[dest]=1;
 }
 return {rgba,mask,complete:mask.every(v=>v===1)};
}
