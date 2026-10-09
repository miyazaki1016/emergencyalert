import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {assignRegions} from './national-region-ownership';
const root=process.argv[2];
const reports=readdirSync(root).filter(f=>f.endsWith('.ownership.json')).sort().map(f=>JSON.parse(readFileSync(join(root,f),'utf8')));
if(reports.length!==47 || reports.some((r,i)=>r.code!==String(i+1).padStart(2,'0'))) throw new Error('All47 proof incomplete');
const ownership=assignRegions(reports.flatMap(r=>r.chunks),8);
const result={mode:'ALL47_CHUNK_OWNERSHIP_PROOF',prefectures:47,queries:reports.reduce((s,r)=>s+r.queries,0),positiveQueries:reports.reduce((s,r)=>s+r.positive,0),chunks:Object.keys(ownership.owners).length,ownership,capacityAccepted:false,limitations:['Exact real geometry per-prefecture/tile equivalence; union follows disjoint chunk identity and canonical gather','Bytes balance is not traffic/CPU/RSS balance; target-runtime hot regions remain unmeasured','Local proof; no Production chunk placement or regional queue deployment']};
writeFileSync(join(root,'ownership-summary.json'),JSON.stringify(result)); console.log(JSON.stringify(result));
