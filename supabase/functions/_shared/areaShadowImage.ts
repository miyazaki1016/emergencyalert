import {Buffer} from 'node:buffer';
import {PNG} from 'npm:pngjs@7.0.0';
import {measureArea} from './areaShadow.ts';
import {classify} from './replayJma.ts';
import {sha256} from './replayAreaReader.ts';
import type {WindowSpec} from './rainArea.ts';
export async function analyzeImage(pngHex:string,maskHex:string,metadata:Record<string,unknown>,location:{latitude:number;longitude:number}){
 if(!/^\\x(?:[0-9a-f]{2})+$/i.test(pngHex)||!/^\\x(?:[0-9a-f]{2})+$/i.test(maskHex))throw Error('SHADOW_BYTEA_ENCODING');
 const bytes=Buffer.from(pngHex.slice(2),'hex'),mask=Buffer.from(maskHex.slice(2),'hex');
 if(bytes.length>16384||await sha256(bytes)!==metadata.pngSha256)throw Error('SHADOW_IMAGE_HASH');
 const image=PNG.sync.read(bytes,{checkCRC:true}),window=metadata.window as WindowSpec;
 if(!window||image.width!==window.width||image.height!==window.height)throw Error('SHADOW_PNG_GEOMETRY');
 const rgba=Uint8Array.from(image.data);
 if(await sha256(rgba)!==metadata.rgbaSha256)throw Error('SHADOW_RGBA_HASH');
 return {...measureArea(rgba,mask,window,location,classify),maskSha256:await sha256(mask)};
}
