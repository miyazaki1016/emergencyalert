import {readFileSync} from 'node:fs';
import {replayScheduler,type ServiceProfile} from './national-rain-scheduler-replay';
const evidenceText=readFileSync(process.argv[2]??'docs/proofs/national-readiness-ci502.json','utf8');
const evidence=JSON.parse(evidenceText);
const rows=(evidence.sources ? Object.values(evidence.sources).flat() : [evidence]) as {layout?:string;globalCap?:number;gapMs?:number;reports?:{codes:string[];result:{done:number};elapsedMs:number;processMaxRssMiB:number}[]}[];
const regional=rows.find(r=>r.layout==='regional' && r.globalCap===2 && r.gapMs===0);
if(!regional?.reports) throw new Error('Missing calibration');
const profiles:Record<string,ServiceProfile>={};
for(const r of regional.reports) profiles[r.codes[0]]={jobs:r.result.done,elapsedMs:r.elapsedMs,rssMiB:r.processMaxRssMiB};
const regions=Object.keys(profiles);
const distribute=(n:number)=>Object.fromEntries(regions.map((r,i)=>[r,Math.floor(n/regions.length)+Number(i<n%regions.length)]));
for(const scenario of ['normal','576','1536','consecutive-burst'] as const) for(const policy of ['continuous2','queue-aware2','queue-aware3'] as const){
 const total=scenario==='normal'?48:scenario==='576'?576:1536;
 const arrivals=distribute(total);
 const arrivalsByCycle=scenario==='consecutive-burst'?Array.from({length:24},(_,i)=>distribute(i<12?1536:48)):undefined;
 const result=replayScheduler({policy:'regional',profiles,mixed:profiles[regions[0]],arrivals,arrivalsByCycle,cycles:24,globalCap:policy==='queue-aware3'?3:2,serviceMultiplier:1.5,...(policy==='continuous2'?{}:{backlogThreshold:64,oldestThresholdMs:60000})});
 console.log(JSON.stringify({scenario,schedulerPolicy:policy,calibration:process.argv[2] ?? 'CI502 cold 4 representative workers; 1.5x service margin',rssIsMeasured:false,profiles,...result,decision:policy==='queue-aware3'?'COMPARISON_ONLY_NOT_ACCEPTED':'PROOF_ONLY'}));
}
