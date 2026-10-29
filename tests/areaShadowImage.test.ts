import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {PNG} from 'pngjs';
import {areaWindow} from '../supabase/functions/_shared/rainArea';
import * as shadow from '../supabase/functions/_shared/areaShadow';
import {classifyRainPixel} from '../lib/weather/providers/jma/classifyPixel';
const require=createRequire(import.meta.url),exports:any={},hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const source=readFileSync('supabase/functions/_shared/areaShadowImage.ts','utf8').replace('npm:pngjs@7.0.0','pngjs');
new Function('exports','require',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports,(name:string)=>name==='./areaShadow.ts'?shadow:name==='./replayJma.ts'?{classify:classifyRainPixel}:name==='./replayAreaReader.ts'?{sha256:async(b:Uint8Array)=>hash(b)}:require(name));
function fixture(){const location={latitude:35.66,longitude:139.82},window=areaWindow(location.latitude,location.longitude),png=new PNG({width:window.width,height:window.height});png.data.fill(0);const bytes=PNG.sync.write(png),mask=Buffer.alloc(window.width*window.height,1);return {location,png:'\\x'+bytes.toString('hex'),mask:'\\x'+mask.toString('hex'),metadata:{window,pngSha256:hash(bytes),rgbaSha256:hash(png.data)}};}
it('analyzes verified PNG bytes and records the source mask digest',async()=>{const f=fixture(),m=await exports.analyzeImage(f.png,f.mask,f.metadata,f.location);expect(m.circles['250'].rainFraction).toBe(0);expect(m.circles['1000'].usableCoverage).toBe(1);expect(m.maskSha256).toHaveLength(64);});
it('rejects changed PNG or RGBA hashes before they become dry observations',async()=>{const f=fixture();await expect(exports.analyzeImage(f.png,f.mask,{...f.metadata,pngSha256:'wrong'},f.location)).rejects.toThrow('IMAGE_HASH');await expect(exports.analyzeImage(f.png,f.mask,{...f.metadata,rgbaSha256:'wrong'},f.location)).rejects.toThrow('RGBA_HASH');});
it('rejects invalid and odd-length bytea encoding',async()=>{const f=fixture();await expect(exports.analyzeImage(f.png+'f',f.mask,f.metadata,f.location)).rejects.toThrow('BYTEA_ENCODING');await expect(exports.analyzeImage(f.png,'\\xzz',f.metadata,f.location)).rejects.toThrow('BYTEA_ENCODING');});
