import {timestamp,type Snapshot,type Frame,type Evidence} from './rainReplay.ts';
import type {WindowSpec} from './rainArea.ts';
export const SHADOW_VERSION='area-shadow-v1';
export const THRESHOLDS=[0.2,0.4,0.6] as const;
export type Status='RAIN'|'NO_RAIN'|'INDETERMINATE';
type Pixel={status:string;intensityClass:string|null};
export type Classifier=(rgba:{r:number;g:number;b:number;a:number})=>Pixel;
const BINS=['LT_1','1_TO_5','5_TO_10','10_TO_20','20_TO_30','30_TO_50','50_TO_80','GTE_80'];
export function worldPoint(latitude:number,longitude:number){
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>60||longitude< -180||longitude>=180)throw Error('SHADOW_LOCATION');
 return {x:(longitude+180)/360*262144,y:(1-Math.asinh(Math.tan(latitude*Math.PI/180))/Math.PI)/2*262144};
}
export function measureArea(rgba:Uint8Array,mask:Uint8Array,w:WindowSpec,location:{latitude:number;longitude:number},classify:Classifier){
 if(!Number.isInteger(w.originX)||!Number.isInteger(w.originY)||!Number.isInteger(w.width)||!Number.isInteger(w.height)||w.width<3||w.height<3||w.width>63||w.height>63||rgba.length!==w.width*w.height*4||mask.length!==w.width*w.height||mask.some(v=>v!==0&&v!==1))throw Error('SHADOW_IMAGE_SHAPE');
 const center=worldPoint(location.latitude,location.longitude),mpp=156543.03392804097*Math.cos(location.latitude*Math.PI/180)/1024;
 if(w.zoom!==10||w.centerX!==Math.floor(center.x)||w.centerY!==Math.floor(center.y)||Math.abs(w.metersPerPixel-mpp)>0.01)throw Error('SHADOW_GEOMETRY');
 if((center.x-w.originX)*mpp<1000||(center.y-w.originY)*mpp<1000||(w.originX+w.width-center.x)*mpp<1000||(w.originY+w.height-center.y)*mpp<1000)throw Error('SHADOW_CROP_TOO_SMALL');
 const classes:Pixel[]=Array.from(mask,(available,i)=>available?classify({r:rgba[i*4],g:rgba[i*4+1],b:rgba[i*4+2],a:rgba[i*4+3]}):{status:'MISSING',intensityClass:null});
 const centerIndex=(Math.floor(center.y)-w.originY)*w.width+Math.floor(center.x)-w.originX;
 const circles:Record<string,ReturnType<typeof circle>>={};
 function circle(radius:number){
  const weights=new Float64Array(mask.length);let total=0,known=0,available=0,rain=0,unknown=0,nearest:number|null=null;
  const histogram:Record<string,number>=Object.fromEntries(BINS.map(b=>[b,0]));
  for(let y=0;y<w.height;y++)for(let x=0;x<w.width;x++){
   const i=y*w.width+x;let count=0;
   for(let sy=0;sy<8;sy++)for(let sx=0;sx<8;sx++){
    const dx=(w.originX+x+(sx+0.5)/8-center.x)*mpp,dy=(w.originY+y+(sy+0.5)/8-center.y)*mpp;
    if(dx*dx+dy*dy<=radius*radius)count++;
   }
   const weight=count/64;weights[i]=weight;total+=weight;if(!weight||!mask[i])continue;
   available+=weight;const c=classes[i];
   if(c.status!=='RAIN'&&c.status!=='NO_RAIN'){unknown+=weight;continue;}known+=weight;
   if(c.status==='RAIN'){
    rain+=weight;if(c.intensityClass&&histogram[c.intensityClass]!==undefined)histogram[c.intensityClass]+=weight;
    const distance=Math.hypot(w.originX+x+0.5-center.x,w.originY+y+0.5-center.y)*mpp;nearest=nearest===null?distance:Math.min(nearest,distance);
   }
  }
  const seen=new Set<number>();let components=0,largest=0,hole:number|null=null;
  for(let first=0;first<classes.length;first++){
   if(!weights[first]||seen.has(first)||!['RAIN','NO_RAIN'].includes(classes[first].status))continue;
   const state=classes[first].status,queue=[first];seen.add(first);let size=0,touchesBoundary=false,touchesUnknown=false,hasCenter=false;
   for(let q=0;q<queue.length;q++){
    const i=queue[q],x=i%w.width,y=Math.floor(i/w.width);size+=weights[i];hasCenter ||= i===centerIndex;
    for(const [nx,ny]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
     if(nx<0||ny<0||nx>=w.width||ny>=w.height){touchesBoundary=true;continue;}
     const n=ny*w.width+nx;if(!weights[n]){touchesBoundary=true;continue;}
     if(!['RAIN','NO_RAIN'].includes(classes[n].status))touchesUnknown=true;
     if(classes[n].status===state&&!seen.has(n)){seen.add(n);queue.push(n);}
    }
   }
   if(state==='RAIN'){components++;largest=Math.max(largest,size);}
   if(state==='NO_RAIN'&&hasCenter&&!touchesBoundary&&!touchesUnknown)hole=size*mpp*mpp;
  }
  return {radiusMeters:radius,sampledAreaM2:total*mpp*mpp,knownAreaM2:known*mpp*mpp,
   usableCoverage:total?known/total:0,availableCoverage:total?available/total:0,unknownFraction:total?unknown/total:0,missingFraction:total?(total-available)/total:1,
   rainFraction:known?rain/known:null,intensityFractions:Object.fromEntries(Object.entries(histogram).map(([b,v])=>[b,known?v/known:null])),
   largestRainPatchFraction:known?largest/known:null,rainComponentCount:components,nearestRainPixelCenterMeters:nearest,centerDryHoleM2:hole};
 }
 for(const radius of [250,500,1000])circles[String(radius)]=circle(radius);
 return {version:SHADOW_VERSION,center:classes[centerIndex],circles,sampling:'8x8_SUBPIXEL_CIRCLE_LOCAL_GROUND_METERS',connectivity:'4_NEIGHBOR_IMAGE_PIXELS_NOT_INDEPENDENT_RADAR_SAMPLES',occupancyIsProbability:false};
}
export type AreaMetrics=ReturnType<typeof measureArea>;
export type Feature={kind:string;baseTime:string;validTime:string;pngSha256:string;matchesInputPixel:boolean|null;capturedAt:string;metrics:AreaMetrics};
export function classifyCandidate(point:Status,metrics:AreaMetrics|null,threshold:number,previous:Status,method:'area'|'combined'):Status{
 const near=metrics?.circles['250'],main=metrics?.circles['500'];
 if(!near||!main||near.usableCoverage<0.95||main.usableCoverage<0.95||near.rainFraction===null||main.rainFraction===null)return 'INDETERMINATE';
 const p=main.rainFraction,n=near.rainFraction,off=threshold/2;
 if(method==='area')return p>=threshold?'RAIN':p<=off?'NO_RAIN':previous;
 if((point==='RAIN'&&p>=off)||(p>=threshold&&n>=off))return 'RAIN';
 if(point==='NO_RAIN'&&p<=off&&n<=off)return 'NO_RAIN';
 return previous;
}
const status=(value?:string):Status=>value==='RAIN'||value==='NO_RAIN'?value:'INDETERMINATE';
function transition(series:Array<{validTime:string;state:Status}>,initial:Frame|null,decided:number){
 const result:{rainStartsAt:string|null;rainEndsAt:string|null}={rainStartsAt:null,rainEndsAt:null};
 for(let i=0;i+2<series.length;i++){
  const run=series.slice(i,i+3),time=timestamp(run[0].validTime)!;
  if(time<decided||run.some((r,k)=>timestamp(r.validTime)!==time+k*300000))continue;
  const prev=i>0?series[i-1]:initial?{validTime:initial.validTime!,state:status(initial.status)}:null;
  if(!prev||timestamp(prev.validTime)!==time-300000)continue;
  if(!result.rainStartsAt&&prev.state==='NO_RAIN'&&run.every(r=>r.state==='RAIN'))result.rainStartsAt=run[0].validTime;
  if(!result.rainEndsAt&&prev.state==='RAIN'&&run.every(r=>r.state==='NO_RAIN'))result.rainEndsAt=run[0].validTime;
 }
 return result;
}
export function compareShadow(snapshot:Snapshot,features:Feature[],observations:Evidence[],productionRadar:unknown,now:number){
 const decided=timestamp(snapshot.decidedAt);if(decided===null)throw Error('SHADOW_DECISION_TIME');
 const initial=[...snapshot.observation].filter(f=>timestamp(f.validTime)!==null&&timestamp(f.validTime)!<=decided&&timestamp(f.baseTime)===timestamp(f.validTime)&&decided-timestamp(f.validTime)!<=15*60000).sort((a,b)=>timestamp(b.validTime)!-timestamp(a.validTime)!)[0]??null;
 const frames=[...snapshot.forecast].filter(f=>timestamp(f.baseTime)!==null&&timestamp(f.validTime)!==null&&timestamp(f.baseTime)!<=decided&&timestamp(f.baseTime)!<=timestamp(f.validTime)!).sort((a,b)=>timestamp(a.validTime)!-timestamp(b.validTime)!);
 if(new Set(frames.map(f=>`${f.baseTime}/${f.validTime}`)).size!==frames.length)throw Error('SHADOW_DUPLICATE_FORECAST');
 const groups=[...new Set(frames.map(f=>f.baseTime!))];
 const result=groups.map(baseTime=>{
  const source=frames.filter(f=>f.baseTime===baseTime);
  const point=source.map(f=>({validTime:f.validTime!,state:status(f.status)}));
  const variants=THRESHOLDS.map(threshold=>{
   const make=(method:'area'|'combined')=>{
    let previous:Status='INDETERMINATE',last:number|null=null;
    const series=source.map(f=>{
     const time=timestamp(f.validTime)!,feature=features.find(x=>x.kind==='FORECAST'&&x.baseTime===baseTime&&x.validTime===f.validTime);
     if(last!==null&&time-last!==300000)previous='INDETERMINATE';
     // Later-retrieved source must match the recorded input center; >30min is coarser native data.
     const reason=!feature?'IMAGE_MISSING':feature.matchesInputPixel!==true?'INPUT_CENTER_UNVERIFIED':timestamp(feature.capturedAt)===null||timestamp(feature.capturedAt)!>now?'INVALID_CAPTURE_TIME':timestamp(feature.capturedAt)!>time?'POST_VALID_RETRIEVAL':time-timestamp(baseTime)!>30*60000?'COARSE_SOURCE_HORIZON':feature.metrics.circles['250'].usableCoverage<0.95||feature.metrics.circles['500'].usableCoverage<0.95?'INSUFFICIENT_KNOWN_COVERAGE':'EXPERIMENTAL_RULE';
     const state=reason==='EXPERIMENTAL_RULE'?classifyCandidate(status(f.status),feature!.metrics,threshold,previous,method):'INDETERMINATE';
     previous=state;last=time;return {validTime:f.validTime!,state,reason};
    });return {series,transitions:transition(series,initial,decided)};
   };
   return {threshold,releaseThreshold:threshold/2,area:make('area'),combined:make('combined')};
  });
  const actualAt=(time:string):Status=>{
   const t=timestamp(time);if(t===null||t>now)return 'INDETERMINATE';
   const obs=observations.filter(o=>o.kind==='OBSERVATION'&&o.validTime===time&&timestamp(o.baseTime)===t&&(timestamp(o.capturedAt)??-Infinity)>=t&&(timestamp(o.capturedAt)??Infinity)<=now);
   if(!obs.length||obs.some(o=>status(o.status)==='INDETERMINATE')||new Set(obs.map(o=>o.status)).size!==1)return 'INDETERMINATE';
   return status(obs[0].status);
  };
  const score=(series:Array<{validTime:string;state:Status;reason?:string}>)=>series.filter(p=>timestamp(p.validTime)!>decided).map(p=>{const actual=actualAt(p.validTime);return {validTime:p.validTime,leadMinutes:(timestamp(p.validTime)!-decided)/60000,predicted:p.state,actual,reason:p.reason??'POINT_INPUT',verdict:p.state==='INDETERMINATE'||actual==='INDETERMINATE'?'INDETERMINATE':p.state===actual?'MATCH':'MISMATCH'};});
  return {baseTime,point:{series:point,transitions:transition(point,initial,decided),scores:score(point)},variants:variants.map(v=>({...v,area:{...v.area,scores:score(v.area.series)},combined:{...v.combined,scores:score(v.combined.series)}}))};
 });
 return {version:SHADOW_VERSION,experimental:true,primaryRadiusMeters:500,contextRadiiMeters:[250,1000],thresholds:THRESHOLDS,minUsableCoverage:0.95,
  temporalRule:'3_FRAMES_AT_5MIN_SPACING_WITH_OPPOSITE_PRECEDING_STATE',pointComparator:'COMMON_BINARY_RULE_NOT_PRODUCTION_NOTIFICATION_ENGINE',
  currentProduction:{eventType:snapshot.eventType,targetTime:snapshot.targetTime,interpretation:snapshot.interpretation,radarResult:productionRadar},
  truth:'RECORDED_RADAR_CENTER_NOT_GROUND_RAIN',groundTruth:'NOT_EVALUATED',groups:result};
}
