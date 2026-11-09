/** Research-only reproduction of RainInterpretationEngine's actionable thresholds.
 * Not connected to notification dispatch. No DB, network, or push side effects.
 */
export type Class='DRY'|'LT_1'|'1_TO_5'|'5_TO_10'|'10_TO_20'|'20_TO_30'|'30_TO_50'|'50_TO_80'|'GTE_80'|'UNKNOWN';
export type Sample={minute:number;intensity:Class};
export type ActionableEvidence={minute:number|null;rule:'STRONG_SINGLE'|'MODERATE_TWO'|'LIGHT_THREE'|null;state:'FOUND'|'LEFT_CENSORED'|'RIGHT_CENSORED'|'INDETERMINATE'};
const strong=new Set<Class>(['10_TO_20','20_TO_30','30_TO_50','50_TO_80','GTE_80']);
export function productionEquivalentActionable(samples:Sample[]):ActionableEvidence{
 const a=[...samples].sort((x,y)=>x.minute-y.minute);
 const unknown:ActionableEvidence={minute:null,rule:null,state:'INDETERMINATE'};
 if(!a.length||a.some(x=>!Number.isFinite(x.minute)||x.intensity==='UNKNOWN'))return unknown;
 for(let i=1;i<a.length;i++)if(a[i].minute===a[i-1].minute)return unknown;
 const candidates:{minute:number;rule:NonNullable<ActionableEvidence['rule']>}[]=[];
 const run=(i:number,n:number,cls:Class)=>Array.from({length:n},(_,j)=>a[i+j]).every((x,j)=>x?.intensity===cls&&(j===0||x.minute-a[i+j-1].minute===5));
 for(let i=0;i<a.length;i++){
  if(strong.has(a[i].intensity))candidates.push({minute:a[i].minute,rule:'STRONG_SINGLE'});
  if(i+1<a.length&&run(i,2,'5_TO_10'))candidates.push({minute:a[i].minute,rule:'MODERATE_TWO'});
  if(i+2<a.length&&run(i,3,'1_TO_5'))candidates.push({minute:a[i].minute,rule:'LIGHT_THREE'});
 }
 const first=candidates.sort((x,y)=>x.minute-y.minute)[0];
 if(first)return {...first,state:'FOUND'};
 // Cannot rule out an event before the first archived frame or after the last.
 return {minute:null,rule:null,state:(a[0].intensity==='1_TO_5'||a[0].intensity==='5_TO_10'||strong.has(a[0].intensity))?'LEFT_CENSORED':'RIGHT_CENSORED'};
}
