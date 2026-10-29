import {classifyRainPixel} from '../weather/providers/jma/classifyPixel';
export type State='RAIN'|'NO_RAIN'|'INDETERMINATE';
export type Method='point'|'area'|'combined';
export type Evaluation={id:string;target_id:string;event_type:string;target_time:string|null;created_at:string;notification_id:number|null;state:string;image_state:string;shadow_state:string;delivery_record_status?:string;attempts?:number;image_attempts?:number;shadow_attempts?:number;deadline_at?:string;last_error?:string|null;image_error?:string|null;shadow_error?:string|null;radar_result?:{reason?:string;missingTimes?:string[];exact?:string;within5?:string;within10?:string};snapshot:{decidedAt:string;body?:string;location:{latitude:number;longitude:number};[key:string]:unknown}};
export type Score={validTime:string;predicted:State;actual:State;verdict:string;reason?:string;leadMinutes?:number};
export type Series={series:Array<{validTime:string;state:State;reason?:string}>;scores:Score[];transitions?:{rainStartsAt:string|null;rainEndsAt:string|null}};
export type Shadow={evaluation_id:string;algorithm_version:string;features:Array<{kind:string;baseTime:string;validTime:string;matchesInputPixel:boolean|null;capturedAt:string;metrics:{circles:Record<string,{rainFraction:number|null;usableCoverage:number;missingFraction:number;unknownFraction:number;rainComponentCount:number;centerDryHoleM2:number|null}>}}>;
 comparison:{groups:Array<{baseTime:string;point:Series;variants:Array<{threshold:number;area:Series;combined:Series}>}>;imageErrors?:unknown[]};computed_at:string};
export type GroundReport={evaluation_id:string;observed_at:string;weather:'RAIN'|'NO_RAIN'|'UNKNOWN';report_source:'AT_LOCATION'|'CAMERA'|'NEARBY_REFERENCE';location_confirmed:boolean;note:string;updated_at?:string};
export type Health={started_at:string;finished_at?:string|null;status:string;summary?:Record<string,unknown>;mode?:string};
export type ImageRow={frame_kind:string;base_time:string;valid_time:string;crop_png:string;availability_mask:string;width:number;height:number;complete:boolean;metadata:{centerRgba?:{r:number;g:number;b:number;a:number}|null;pngSha256?:string;capturedAt?:string;matchesInputPixel?:boolean|null;window:{originX:number;originY:number;metersPerPixel:number;width:number;height:number};[key:string]:unknown}};
export type LabData={evaluations:Evaluation[];total:number;shadows:Shadow[];reports:GroundReport[];targets:Array<{id:string;label:string}>;feedback:Array<{notification_id:number;actual_weather:string;observed_at:string|null;observed_time_source:string|null}>;health:{observation:Health|null;radar:Health|null;images:Health|null;shadow:Health|null};probe:{image:ImageRow;sourceValidTime:string}|null};
export const METHODS:Method[]=['point','area','combined'];
export const METHOD_LABELS:Record<Method,string>={point:'点（共通ルール）',area:'面（500m）',combined:'点と面の併用'};
export const STATE_LABELS:Record<State,string>={RAIN:'雨',NO_RAIN:'雨なし',INDETERMINATE:'保留'};
export const REASONS:Record<string,string>={IMAGE_MISSING:'画像の回収待ち',INPUT_CENTER_UNVERIFIED:'当時の中心画素と未照合',INVALID_CAPTURE_TIME:'取得時刻を確認できない',POST_VALID_RETRIEVAL:'予測時刻を過ぎて画像を取得',COARSE_SOURCE_HORIZON:'元データの解像度が粗い',INSUFFICIENT_KNOWN_COVERAGE:'欠測・未知色が多い',EXPERIMENTAL_RULE:'研究用の比較ルール',POINT_INPUT:'当時の中心画素'};
export function parseTime(value:string|null|undefined):number|null{if(!value)return null;const iso=/^\d{14}$/.test(value)?`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(8,10)}:${value.slice(10,12)}:${value.slice(12,14)}Z`:value;const n=Date.parse(iso);return Number.isFinite(n)?n:null;}
export function tokyo(value:string|null|undefined){const n=parseTime(value);return n===null?'—':new Date(n).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
export function percent(value:number|null|undefined){return typeof value==='number'&&Number.isFinite(value)?`${Math.round(value*100)}%`:'—';}
export function groundAt(reports:GroundReport[],id:string,time:string,now=Date.now()):State{
 const t=parseTime(time);if(t===null||t>now)return 'INDETERMINATE';
 const matching=reports.filter(r=>r.evaluation_id===id&&r.location_confirmed&&r.report_source!=='NEARBY_REFERENCE'&&r.weather!=='UNKNOWN'&&parseTime(r.observed_at)!==null&&parseTime(r.observed_at)!<=now&&Math.abs(parseTime(r.observed_at)!-t)<=150000);
 const states=new Set(matching.map(r=>r.weather));return states.size===1?[...states][0] as State:'INDETERMINATE';
}
export function summarize(data:LabData,threshold:number,source:'ground'|'radar',now=Date.now()){
 const totals=Object.fromEntries(METHODS.map(m=>[m,{matched:0,falseRain:0,falseDry:0,abstained:0}])) as Record<Method,{matched:number;falseRain:number;falseDry:number;abstained:number}>;
 let potential=0,truthMissing=0,paired=0;const conflictingWindows=new Set<string>();const cases=new Set<string>(),rainCases=new Set<string>(),dryCases=new Set<string>();
 for(const e of data.evaluations){if(e.shadow_state==='PENDING')continue;const shadow=data.shadows.find(s=>s.evaluation_id===e.id);if(!shadow)continue;
  for(const group of shadow.comparison.groups??[]){const variant=group.variants.find(v=>Math.abs(v.threshold-threshold)<0.0001);if(!variant)continue;
   const pointRows=group.point.scores??[];
   for(const p of pointRows){const t=parseTime(p.validTime),decided=parseTime(e.snapshot.decidedAt);if(t===null||decided===null||t<=decided||t>now)continue;
    const a=variant.area.series.find(x=>x.validTime===p.validTime),c=variant.combined.series.find(x=>x.validTime===p.validTime);potential++;
    const truth=source==='ground'?groundAt(data.reports,e.id,p.validTime,now):p.actual;
    if(truth==='INDETERMINATE') {truthMissing++;if(source==='ground'){const states=new Set(data.reports.filter(r=>r.evaluation_id===e.id&&r.location_confirmed&&r.report_source!=='NEARBY_REFERENCE'&&r.weather!=='UNKNOWN'&&(parseTime(r.observed_at)??Infinity)<=now&&Math.abs((parseTime(r.observed_at)??Infinity)-t)<=150000).map(r=>r.weather));if(states.size>1)conflictingWindows.add(`${e.id}:${p.validTime}`);}continue;}
    const predicted:Record<Method,State>={point:p.predicted,area:a?.state??'INDETERMINATE',combined:c?.state??'INDETERMINATE'};
    for(const m of METHODS)if(predicted[m]==='INDETERMINATE')totals[m].abstained++;
    if(METHODS.some(m=>predicted[m]==='INDETERMINATE'))continue;
    paired++;cases.add(e.id);if(truth==='RAIN')rainCases.add(e.id);else dryCases.add(e.id);
    for(const m of METHODS){if(predicted[m]===truth)totals[m].matched++;else if(predicted[m]==='RAIN')totals[m].falseRain++;else totals[m].falseDry++;}
   }
  }
 }
 return {totals,potential,truthMissing,paired,caseCount:cases.size,rainCaseCount:rainCases.size,dryCaseCount:dryCases.size,conflictingReports:conflictingWindows.size};
}
export function validateGroundReport(r:GroundReport,now=Date.now()):string|null{
 if(!['RAIN','NO_RAIN','UNKNOWN'].includes(r.weather))return '天気を選んでください。';
 if(!['AT_LOCATION','CAMERA','NEARBY_REFERENCE'].includes(r.report_source))return '確認方法を選んでください。';
 const t=parseTime(r.observed_at);if(t===null||t>now+60000)return '実際に確認した過去の時刻を入力してください。';
 if(r.report_source!=='NEARBY_REFERENCE'&&!r.location_confirmed)return '登録地点そのものの確認であることを確認してください。';
 if(r.note.length>300)return 'メモは300文字以内にしてください。';return null;
}
export function imageDataUrl(hex:string):string|null{if(!/^\\x(?:[0-9a-f]{2})+$/i.test(hex)||hex.length>32770)return null;const parts=hex.slice(2).match(/../g)??[];const bytes=Uint8Array.from(parts.map(p=>parseInt(p,16)));if(bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71)return null;return `data:image/png;base64,${btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''))}`;}

export function centerPixelLabel(image:ImageRow,index:number):string{
 const mask=image.availability_mask.slice(2).match(/../g)??[];
 if(mask[index]==='00')return '未取得（雨なしには数えない）';
 if(mask[index]!=='01')return '取得状態を確認できない';
 const rgba=image.metadata.centerRgba;
 if(!rgba||!['r','g','b','a'].every(k=>Number.isInteger(rgba[k as keyof typeof rgba])&&rgba[k as keyof typeof rgba]>=0&&rgba[k as keyof typeof rgba]<=255))return '中心の色情報なし';
 if(rgba.a===0)return '取得済み透明（レーダー雨色なし）';
 const c=classifyRainPixel(rgba);return c.status==='RAIN'?`雨色（${c.intensityClass==='LT_1'?'1mm/h未満':c.intensityClass==='1_TO_5'?'1〜5mm/h':c.intensityClass}）`:'未知色（判定保留）';
}
