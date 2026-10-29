import {timestamp,type Frame} from '../_shared/rainReplay.ts';
export type ForecastEpisode={id:string;active:boolean;approachNotified:boolean;peakSevere:number;clearForecasts:number;lastForecastAt:string|null};
export type ForecastSignal='ACTIVE'|'CLEAR'|'UNKNOWN';
export function forecastSignal(rain:{interpretationEnabled?:boolean;interpretation?:unknown;forecast?:Frame[]},now:number):{signal:ForecastSignal;validAt:string|null}{
 const frames=rain.forecast??[],bases=[...new Set(frames.map(f=>f.baseTime))],validAt=bases.length===1&&timestamp(bases[0])!==null?bases[0]!:null;
 if(!rain.interpretationEnabled||!validAt||timestamp(validAt)!>now)return {signal:'UNKNOWN',validAt};
 const future=frames.filter(f=>(timestamp(f.validTime)??-Infinity)>=now);
 if(future.some(f=>f.status==='RAIN'))return {signal:'ACTIVE',validAt};
 const state=(rain.interpretation as {state?:string}|null)?.state;
 // DRY is emitted by the existing engine only after expected-frame coverage is verified.
 return {signal:state==='DRY'&&future.length>0&&future.every(f=>f.status==='NO_RAIN')?'CLEAR':'UNKNOWN',validAt};
}
export function seedForecastEpisode(id:string,legacy:{last_notified_at?:string|null;last_event?:unknown;severe_rain_level?:number}|null,recentClear:boolean):ForecastEpisode{
 return {id,active:!recentClear,approachNotified:!recentClear&&Boolean(legacy?.last_notified_at),peakSevere:recentClear?0:Number(legacy?.severe_rain_level??0),clearForecasts:recentClear?3:0,lastForecastAt:null};
}
export function advanceForecastEpisode(previous:ForecastEpisode,signal:ForecastSignal,validAt:string|null,newId:string):ForecastEpisode{
 if(signal==='UNKNOWN'&&!validAt)return {...previous,clearForecasts:0};
 if(!validAt||timestamp(validAt)===null||(previous.lastForecastAt&&validAt<=previous.lastForecastAt))return previous;
 if(signal==='UNKNOWN')return {...previous,lastForecastAt:validAt,clearForecasts:0};
 if(signal==='CLEAR'){
  const clearForecasts=Math.min(3,previous.clearForecasts+1);
  return {...previous,lastForecastAt:validAt,clearForecasts,...(clearForecasts>=3?{active:false,approachNotified:false,peakSevere:0}:{})};
 }
 return previous.active?{...previous,lastForecastAt:validAt,clearForecasts:0}:{id:newId,active:true,approachNotified:false,peakSevere:0,clearForecasts:0,lastForecastAt:validAt};
}
export function severeForecast(frames:Frame[],now:number){
 const rank=(v?:string|null)=>v==='GTE_80'?3:v==='50_TO_80'?2:v==='30_TO_50'?1:0;
 return [...frames].filter(f=>f.status==='RAIN'&&timestamp(f.baseTime)!==null&&timestamp(f.baseTime)!<=now&&timestamp(f.validTime)!==null&&timestamp(f.validTime)!>=now&&rank(f.intensityClass)>0).sort((a,b)=>rank(b.intensityClass)-rank(a.intensityClass)||timestamp(a.validTime)!-timestamp(b.validTime)!)[0]??null;
}
export function forecastEpisodeDecision(state:ForecastEpisode,enabled:boolean,actionable:boolean,severeLevel:number,ending:boolean){
 const severe=enabled&&severeLevel>state.peakSevere;
 const approach=enabled&&state.active&&actionable&&!state.approachNotified;
 return {notify:severe||approach||(enabled&&ending),severe,key:`${state.id}/${severe?'SEVERE_'+severeLevel:ending?'ENDING':'APPROACH'}`};
}

export function bootstrapForecastEpisode(id:string,legacy:Parameters<typeof seedForecastEpisode>[1],recent:Array<{source_valid_at:string|null;event_type:string|null;checked_at:string}>,currentAt:string|null):ForecastEpisode{
 const unique=new Map<string,typeof recent[number]>();
 for(const row of recent){const at=row.source_valid_at;if(!at||timestamp(at)===null||(currentAt&&at>=currentAt)||unique.has(at))continue;unique.set(at,row);}
 const prior=[...unique.values()].slice(0,3);let clear=0;
 for(const row of prior){if(row.event_type!=='RAIN_CLEAR'||(legacy?.last_notified_at&&Date.parse(row.checked_at)<=Date.parse(legacy.last_notified_at)))break;clear++;}
 return {...seedForecastEpisode(id,legacy,clear===3),clearForecasts:clear,lastForecastAt:prior[0]?.source_valid_at??null};
}
