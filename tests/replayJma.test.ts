import {it,expect} from 'vitest';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {PNG} from 'pngjs';
import * as replay from '../supabase/functions/_shared/rainReplay';
import {VERIFIED_JMA_PNG_PALETTE} from '../lib/weather/providers/jma/pngPalette';
import {latLonToTilePixel} from '../lib/weather/providers/jma/webMercator';
const require=createRequire(import.meta.url),jma:any={};
const source=readFileSync('supabase/functions/_shared/replayJma.ts','utf8').replace('npm:pngjs@7.0.0','pngjs');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('exports','require',code)(jma,(name:string)=>name==='./rainReplay.ts'?replay:require(name));
it('matches the production palette and geographical pixel',()=>{
 for(const entry of VERIFIED_JMA_PNG_PALETTE)expect(jma.classify(entry.rgba)).toEqual({status:'RAIN',intensityClass:entry.intensityClass});
 expect(jma.classify({r:1,g:2,b:3,a:255}).status).toBe('UNKNOWN_PIXEL');
 expect(jma.classify({r:0,g:0,b:0,a:0}).status).toBe('NO_RAIN');
 for(const [lat,lon] of [[35.66,139.82],[26.21,127.68],[43.06,141.35]])expect(jma.tilePixel(lat,lon)).toEqual(latLonToTilePixel(lat,lon,10));
});
it('rejects stale and forecast-only observation indexes',async()=>{
 const payload=[{basetime:'20261029020000',validtime:'20261029020000',elements:['hrpns']}];
 const fetcher=async()=>({ok:true,json:async()=>payload});
 await expect(jma.observationIndex(fetcher,Date.parse('2026-10-29T03:00:00Z'))).rejects.toThrow('INDEX_STALE');
 payload[0].validtime='20261029020500';
 await expect(jma.observationIndex(fetcher,Date.parse('2026-10-29T02:05:00Z'))).rejects.toThrow('INDEX_STALE');
});
it('decodes actual PNG bytes and requests exactly the observation time',async()=>{
 const tile=new PNG({width:256,height:256});tile.data.fill(0);
 const frame=await jma.readObservation({location:{latitude:35.66,longitude:139.82}},'20261029020000',new Set(['20261029020000']),async(url:string)=>{
 expect(url).toContain('/20261029020000/none/20261029020000/');return {ok:true,arrayBuffer:async()=>Uint8Array.from(PNG.sync.write(tile)).buffer};
 });
 expect(frame.status).toBe('NO_RAIN');expect(frame.kind).toBe('OBSERVATION');expect(frame.baseTime).toBe(frame.validTime);
});
