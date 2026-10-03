import { describe, it, expect } from 'vitest';
import { assignRegions, ownedTasks, gatherOwnedResults } from './national-region-ownership';
describe('proof ownership',()=>{
  it('owns all 47 prefectures exactly once with deterministic weighted placement',()=>{
    const chunks=Array.from({length:47},(_,i)=>({code:String(i+1).padStart(2,'0'),file:'chunk-0000.json',bytes:(i+1)*100}));
    const a=assignRegions(chunks),b=assignRegions([...chunks].reverse());
    expect(a).toEqual(b); expect(Object.keys(a.owners)).toHaveLength(47);
    expect(Math.max(...a.loads)-Math.min(...a.loads)).toBeLessThanOrEqual(4700);
    expect(new Set(ownedTasks('frame/tile',chunks,a).map(t=>t.key)).size).toBe(47);
  });
  it('gathers a border or island municipality across workers once in canonical order',()=>{
    const m=(code:string)=>({code,prefecture:'p',municipality:code});
    expect(gatherOwnedResults(['a','b'],[{key:'b',municipalities:[m('47001'),m('01001')]},{key:'a',municipalities:[m('01001')]}]).map(m=>m.code)).toEqual(['01001','47001']);
    expect(()=>gatherOwnedResults(['a','b'],[{key:'a',municipalities:[]}])).toThrow();
    expect(()=>gatherOwnedResults(['a','b'],[{key:'a',municipalities:[]},{key:'a',municipalities:[]}])).toThrow();
  });
  it('rejects ambiguous or missing ownership',()=>{
    const c={code:'01',file:'x',bytes:1};
    expect(()=>assignRegions([c,c])).toThrow();
    expect(()=>ownedTasks('j',[c],assignRegions([]))).toThrow();
  });
});
