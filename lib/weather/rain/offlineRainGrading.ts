/** Offline-only, side-effect-free grading. Never used for push decisions. */
export type RainClass='DRY'|'WEAK'|'ACTIONABLE'|'UNKNOWN';
export type RainSample={minute:number;rain:RainClass};
export type RainGrade='MATCH'|'MISMATCH'|'LEFT_CENSORED'|'RIGHT_CENSORED'|'INDETERMINATE';
export type RainScore={grade:RainGrade;observedMinute:number|null;deltaMinutes:number|null;window:[number,number]|null;reason:string};
const known=(s:RainClass)=>s!=='UNKNOWN';
function normalize(samples:RainSample[]):RainSample[]|null{
 const sorted=[...samples].sort((a,b)=>a.minute-b.minute);
 if(sorted.some(s=>!Number.isFinite(s.minute)||!['DRY','WEAK','ACTIONABLE','UNKNOWN'].includes(s.rain)))return null;
 for(let i=1;i<sorted.length;i++)if(sorted[i].minute===sorted[i-1].minute&&sorted[i].rain!==sorted[i-1].rain)return null;
 return sorted.filter((s,i)=>i===0||s.minute!==sorted[i-1].minute);
}
function score(samples:RainSample[],targetMinute:number,kind:'onset'|'actionable',persistence:number,tolerance:number):RainScore{
 const s=normalize(samples);
 const empty:RainScore={grade:'INDETERMINATE',observedMinute:null,deltaMinutes:null,window:null,reason:'INVALID_OR_EMPTY_EVIDENCE'};
 if(!s?.length||!Number.isFinite(targetMinute)||!Number.isInteger(persistence)||persistence<1||!Number.isFinite(tolerance)||tolerance<0)return empty;
 const window:[number,number]=[s[0].minute,s[s.length-1].minute];
 const wet=(v:RainClass)=>kind==='onset'?(v==='WEAK'||v==='ACTIONABLE'):v==='ACTIONABLE';
 // No claim about the first onset if the observation series begins wet.
 if(wet(s[0].rain))return {grade:'LEFT_CENSORED',observedMinute:null,deltaMinutes:null,window,reason:'ALREADY_WET_AT_WINDOW_START'};
 if(!known(s[0].rain))return {...empty,window,reason:'UNKNOWN_WINDOW_START'};
 let first:number|null=null;
 for(let i=1;i<s.length;i++){
  if(!known(s[i].rain)||!known(s[i-1].rain))continue;
  if(wet(s[i].rain)&&!wet(s[i-1].rain)){
   let sustained=true;
   for(let j=1;j<persistence;j++){
    if(i+j>=s.length){sustained=false;break}
    if(s[i+j].minute-s[i+j-1].minute!==5||!known(s[i+j].rain)||!wet(s[i+j].rain)){sustained=false;break}
   }
   if(sustained){first=s[i].minute;break}
  }
 }
 if(first!==null){const delta=first-targetMinute;return {grade:Math.abs(delta)<=tolerance?'MATCH':'MISMATCH',observedMinute:first,deltaMinutes:delta,window,reason:'OBSERVED_TRANSITION'};}
 if(s.some(x=>!known(x.rain)))return {...empty,window,reason:'UNKNOWN_OR_MISSING_FRAME'};
 return {grade:'RIGHT_CENSORED',observedMinute:null,deltaMinutes:null,window,reason:'NO_COMPLETE_TRANSITION_BEFORE_WINDOW_END'};
}
export function scoreOnset(samples:RainSample[],targetMinute:number,opts:{persistence?:1|2;tolerance?:number}={}):RainScore{
 return score(samples,targetMinute,'onset',opts.persistence??1,opts.tolerance??10);
}
export function scoreActionable(samples:RainSample[],targetMinute:number,opts:{persistence?:1|3;tolerance?:number}={}):RainScore{
 return score(samples,targetMinute,'actionable',opts.persistence??3,opts.tolerance??10);
}
