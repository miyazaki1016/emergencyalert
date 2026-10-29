import {groundAt,parseTime,percent,REASONS,tokyo,type Evaluation,type GroundReport,type Shadow} from './rainLab';

type Frame={baseTime?:string;validTime?:string;status?:string;intensityClass?:string|null;capturedAt?:string;kind?:string};
export type Explanation={code:string;kind:'difference'|'hold'|'context';title:string;detail:string};
export const VERDICT_LABELS:Record<string,string>={MATCH:'一致',MISMATCH:'不一致（時刻・持続条件）',INDETERMINATE:'判定不能'};
export const PATTERNS:Record<string,string>={
 FALSE_RAIN:'雨を予測したが実況中心は雨色なし',MISSED_RAIN:'雨色なしを予測したが実況中心は雨',
 START_EARLY:'雨色への切替が予測対象より早い',START_LATE:'雨色への切替が予測対象より遅い',
 END_EARLY:'雨色が消えた時刻が予測より早い',END_LATE:'雨色が消えた時刻が予測より遅い',END_UNSTABLE:'止む予測後に雨色が残る・戻る',
 STRONGER_FORECAST:'予測の雨量区分が実況より強い',WEAKER_FORECAST:'予測の雨量区分が実況より弱い',
 AREA_SHRINK:'予測より実況の雨域が狭い',AREA_EXPAND:'予測より実況の雨域が広い',POINT_AREA_SPLIT:'中心と周辺の判定が分かれる',
 GROUND_DIFFERENCE:'現地確認とレーダー中心が異なる',METRIC_DIFFERENCE:'通知と評価で雨の基準が異なる',
 DATA_HOLD:'データ不足・対象外で判定保留',SOURCE_HOLD:'当時入力との対応が未確認',GROUND_HOLD:'現地の正解が未確認',
};
const bins=['LT_1','1_TO_5','5_TO_10','10_TO_20','20_TO_30','30_TO_50','50_TO_80','GTE_80'];
const binLabels=['1mm/h未満','1〜5mm/h','5〜10mm/h','10〜20mm/h','20〜30mm/h','30〜50mm/h','50〜80mm/h','80mm/h以上'];
function frames(x:unknown):Frame[]{return Array.isArray(x)?x.filter(f=>f&&typeof f==='object'):[];}
function known(f:Frame|undefined):f is Frame{return Boolean(f&&['RAIN','NO_RAIN'].includes(f.status??''));}
function iso(n:number){return new Date(n).toISOString();}
function observations(e:Evaluation,now:number){
 const decided=parseTime(e.snapshot.decidedAt)??-Infinity;
 const original=frames(e.snapshot.observation).filter(f=>{const t=parseTime(f.validTime);return t!==null&&t<=decided&&t<=now&&t===parseTime(f.baseTime);});
 const later=frames(e.evidence).filter(f=>{const t=parseTime(f.validTime),c=parseTime(f.capturedAt);return t!==null&&t<=now&&f.kind==='OBSERVATION'&&parseTime(f.baseTime)===t&&c!==null&&c>=t&&c<=now;});
 const grouped=new Map<number,Frame[]>();for(const f of [...original,...later]){const t=parseTime(f.validTime)!;grouped.set(t,[...(grouped.get(t)??[]),f]);}
 return new Map([...grouped].map(([t,rows])=>[t,rows.every(known)&&new Set(rows.map(f=>`${f.status}/${f.intensityClass??''}`)).size===1?rows[0]:undefined]));
}
/** Describes recorded differences, never infers physical causes or changes a stored verdict. */
export function explainCase(e:Evaluation,shadow:Shadow|undefined,valid:string,base:string|undefined,threshold:number,reports:GroundReport[],now=Date.now()):Explanation[]{
 const out:Explanation[]=[];const add=(code:string,detail:string,kind:Explanation['kind']='difference')=>out.push({code,kind,title:PATTERNS[code]??code,detail});
 const invalidReasons:Record<string,string>={INVALID_TARGET_TIME:'通知の対象時刻が不正・範囲外です。',UNSUPPORTED_EVENT:'この通知種別は現在の自動評価の対象外です。',INVALID_OR_MISSING_FORECAST_INPUT:'通知時の予測入力が欠けるか、発表・対象時刻・雨の状態が条件に合いません。',NO_PRE_NOTIFICATION_RAIN:'止む通知の前に降雨を確認できた実況が保存されていません。'};
 if(e.radar_result?.reason&&invalidReasons[e.radar_result.reason])add('DATA_HOLD',invalidReasons[e.radar_result.reason],'hold');
 const t=parseTime(valid),target=parseTime(e.target_time),obs=observations(e,now);
 const forecasts=frames(e.snapshot.forecast).filter(f=>!base||f.baseTime===base),matches=forecasts.filter(f=>parseTime(f.validTime)===t);
 const predicted=matches.length===1&&(parseTime(matches[0].baseTime)??Infinity)<=(parseTime(e.snapshot.decidedAt)??-Infinity)&&(parseTime(matches[0].baseTime)??Infinity)<=t!?matches[0]:undefined,actual=t===null?undefined:obs.get(t);
 if(t===null||t>now){add('DATA_HOLD',t===null?'比較時刻が不正です。':`${tokyo(valid)}はまだ未来です。未到来を不一致に数えません。`,'hold');return out;}
 else if(!known(predicted)||!known(actual))add('DATA_HOLD',`${tokyo(valid)}の${!known(predicted)?'当時予測':'実況中心'}が欠けているか、未知色・相反する記録です。雨なしとは扱いません。`,'hold');
 else {
  if(predicted.status!==actual.status)add(predicted.status==='RAIN'?'FALSE_RAIN':'MISSED_RAIN',`${tokyo(valid)}：当時予測=${predicted.status==='RAIN'?'雨':'雨色なし'}、実況中心=${actual.status==='RAIN'?'雨':'取得済み雨色なし'}。これはレーダー同士の差で、現地の空振り・見逃し確定ではありません。`);
  if(predicted.status==='RAIN'&&actual.status==='RAIN'){
   const p=bins.indexOf(predicted.intensityClass??''),a=bins.indexOf(actual.intensityClass??'');
   if(p>=0&&a>=0&&p!==a)add(p>a?'STRONGER_FORECAST':'WEAKER_FORECAST',`${tokyo(valid)}：当時予測=${binLabels[p]}、実況中心=${binLabels[a]}。両方とも雨色で、雨の有無は一致しています。地上雨量の測定ではありません。`);
  }
  const ground=groundAt(reports,e.id,valid,now);if(ground!=='INDETERMINATE'&&ground!==actual.status)add('GROUND_DIFFERENCE',`${tokyo(valid)}前後2分30秒の地点確認=${ground==='RAIN'?'雨':'雨なし'}、実況中心=${actual.status==='RAIN'?'雨色':'雨色なし'}。地点・時刻・確認方法を確認してください。レーダーの見逃し等の原因は未確定です。`);
 }
 if(groundAt(reports,e.id,valid,now)==='INDETERMINATE')add('GROUND_HOLD','この対象時刻に使える現地・地点カメラの確認がない、未来、または記録が相反しています。近隣の参考情報では正解を代用しません。','hold');
 // A transition needs adjacent five-minute observations. A stop additionally needs 10 minutes of persistence.
 if(target!==null&&target<=now){
  const ending=e.event_type==='RAIN_ENDING';const transitions=[...obs].filter(([at,f])=>{
   if(!known(f)||!known(obs.get(at-300000)))return false;
   if(!ending)return f.status==='RAIN'&&obs.get(at-300000)!.status==='NO_RAIN';
   return f.status==='NO_RAIN'&&obs.get(at-300000)!.status==='RAIN'&&obs.get(at+300000)?.status==='NO_RAIN'&&obs.get(at+600000)?.status==='NO_RAIN';
  }).map(([at])=>at).filter(at=>Math.abs(at-target)<=30*60000).sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||a-b);
  const at=transitions[0];if(at!==undefined&&at!==target){const delta=Math.round((at-target)/60000);add(ending?(delta<0?'END_EARLY':'END_LATE'):(delta<0?'START_EARLY':'START_LATE'),`予測対象=${tokyo(iso(target))}、記録で確認できた${ending?'雨色なしへの切替（10分持続）':'雨色への切替'}=${tokyo(iso(at))}。${Math.abs(delta)}分${delta<0?'早い':'遅い'}差です。観測範囲内で対象に最も近い切替を表示し、通知時の実況も補助情報に含みます。`);}
  if(ending){const states=[0,5,10].map(n=>obs.get(target+n*60000));if(states.some(f=>f?.status==='RAIN'))add('END_UNSTABLE',`${tokyo(iso(target))}から10分後までの実況中心に雨色が残る／戻るコマがあります。終了の10分持続条件を満たしません。`);else if(states.some(f=>!known(f)))add('DATA_HOLD','終了判定に必要な対象時刻・5分後・10分後の実況が揃っていません。','hold');}
  if(!ending&&at===undefined&&obs.get(target)?.status==='RAIN'&&obs.get(target-300000)?.status==='RAIN')add('DATA_HOLD',`対象${tokyo(iso(target))}の5分前にも雨色があります。雨の有無は確認できますが、隣接する雨なしコマがないため降り始めの時刻は断定できません。`,'hold');
 }
 if(e.event_type==='ACTIONABLE_RAIN_APPROACHING')add('METRIC_DIFFERENCE','通知対象は生活行動向けの雨の開始、現行の自動評価は弱雨を含む雨色への切替です。基準の差があるため、時刻の不一致だけで通知の空振りと断定しません。','context');
 const feature=shadow?.features.find(f=>f.kind==='FORECAST'&&f.validTime===valid&&(!base||f.baseTime===base)),observation=shadow?.features.find(f=>f.kind==='OBSERVATION'&&f.validTime===valid);
 if(feature?.matchesInputPixel!==true)add('SOURCE_HOLD',feature?.matchesInputPixel===false?'回収した予測画像の中心RGBAが当時入力と一致しません。画像由来の差を予測精度の差と断定しません。':'この時刻の予測画像が未保存、または当時入力中心との照合が未確認です。','hold');
 const group=shadow?.comparison.groups.find(g=>!base||g.baseTime===base),variant=group?.variants.find(v=>Math.abs(v.threshold-threshold)<.0001),area=variant?.area.series.find(f=>f.validTime===valid);
 if(area?.state==='INDETERMINATE')add('DATA_HOLD',`${tokyo(valid)}の面候補：${REASONS[area.reason??'']??'判定理由が未記録'}。${area.reason==='IMAGE_MISSING'?'保存対象外・未回収・取得失敗を含みます。':'保留を雨なし・不一致には数えません。'}`,'hold');
 for(const radius of [250,500,1000]){const p=feature?.metrics.circles[radius],a=observation?.metrics.circles[radius];if(!p||!a)continue;
  if(p.usableCoverage<.95||a.usableCoverage<.95||p.rainFraction===null||a.rainFraction===null){add('DATA_HOLD',`${radius}m円：予測／実況の分類可能範囲=${percent(p.usableCoverage)}／${percent(a.usableCoverage)}。欠測や未知色で面積差を比較できません。`,'hold');continue;}
  const delta=a.rainFraction-p.rainFraction;if(Math.abs(delta)>=.01)add(delta<0?'AREA_SHRINK':'AREA_EXPAND',`${radius===1000?'1km':radius+'m'}円：予測=${percent(p.rainFraction)}、実況=${percent(a.rainFraction)}（${Math.abs(delta*100).toFixed(1)}ポイント${delta<0?'減少':'増加'}）。分類可能範囲はいずれも95%以上。雨雲の移動・消散など、物理的な原因は未確定です。`);
 }
 if(known(predicted)&&area&&area.state!=='INDETERMINATE'&&area.state!==predicted.status)add('POINT_AREA_SPLIT',`${tokyo(valid)}：当時の中心=${predicted.status==='RAIN'?'雨':'雨色なし'}、500m面候補=${area.state==='RAIN'?'雨':'雨なし'}、開始閾値=${percent(threshold)}。中心と周辺の範囲・ヒステリシスの違いを含むため、どちらが正しいかは現地確認が必要です。`,'context');
 return out;
}
