/** Side-effect-free notification replay contract. No Push or database imports. */
export const REPLAY_VERSION = 'radar-point-v1';
export type Verdict = 'MATCH' | 'MISMATCH' | 'INDETERMINATE';
export type Frame = { baseTime?: string; validTime?: string; status?: string; intensityClass?: string | null; rgba?: {r:number;g:number;b:number;a:number} | null; debug?: {zoom:number;tileX:number;tileY:number;pixelX:number;pixelY:number} };
export type Evidence = Frame & { kind: 'OBSERVATION'; capturedAt: string };
export type Snapshot = {
 schemaVersion: 1; engineVersion: string; decidedAt: string;
 eventType: string; targetTime: string | null; targetTimeSource: string | null;
 location: { latitude: number; longitude: number }; title: string; body: string;
 observation: Frame[]; forecast: Frame[]; interpretation: unknown;
 semanticEvent: unknown; previousState: unknown; shouldNotify: true;
 expectedFrames: number | null;
};
export function timestamp(value?: string | null): number | null {
 if (!value) return null;
 const iso = /^\d{14}$/.test(value) ? `${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(8,10)}:${value.slice(10,12)}:${value.slice(12,14)}Z` : value;
 if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(iso)) return null;
 const time = Date.parse(iso);
 if (!Number.isFinite(time)) return null;
 if (/^\d{14}$/.test(value) && jmaTime(time) !== value) return null;
 return time;
}
export function jmaTime(time: number): string { return new Date(time).toISOString().replace(/[-:TZ.]/g,'').slice(0,14); }
export function makeSnapshot(args: {
 eventType: string; decidedAt: string; latitude: number; longitude: number; title: string; body: string;
 rain: { observation?: Frame[]; forecast?: Frame[]; interpretation?: unknown; diagnostic?: {expectedForecastFrames?: number} | unknown; event?: {actionableAt?:string|null;startsAt?:string|null;endingAt?:string|null} | null };
 previousState: unknown; severeTargetTime?: string | null;
}): Snapshot | null {
 if (!['RAIN_APPROACHING','ACTIONABLE_RAIN_APPROACHING','RAIN_ENDING','SEVERE_RAIN'].includes(args.eventType)) return null;
 const event = args.rain.event;
 const source = args.eventType === 'SEVERE_RAIN' ? 'severeForecast' : args.eventType === 'RAIN_ENDING' ? 'endingAt' : args.eventType === 'ACTIONABLE_RAIN_APPROACHING' && event?.actionableAt ? 'actionableAt' : 'startsAt';
 const value = source === 'severeForecast' ? args.severeTargetTime : event?.[source as 'endingAt'|'actionableAt'|'startsAt'];
 const target = timestamp(value);
 return {
  schemaVersion:1,engineVersion:'main-0baa0bc-rain-interpretation',decidedAt:args.decidedAt,
  eventType:args.eventType,targetTime:target === null ? null : jmaTime(target),targetTimeSource:source,
  location:{latitude:args.latitude,longitude:args.longitude},title:args.title,body:args.body,
  observation:structuredClone(args.rain.observation ?? []),forecast:structuredClone(args.rain.forecast ?? []),
  interpretation:structuredClone(args.rain.interpretation ?? null),semanticEvent:structuredClone(event ?? null),
  previousState:structuredClone(args.previousState),shouldNotify:true,
  // The current production API does not expose expectedFrames on successful responses.
  expectedFrames: typeof (args.rain.diagnostic as {expectedForecastFrames?:number}|null)?.expectedForecastFrames === 'number' ? (args.rain.diagnostic as {expectedForecastFrames:number}).expectedForecastFrames : null,
 };
}
export function requiredTimes(snapshot: Snapshot): string[] {
 const t = timestamp(snapshot.targetTime); if (t === null) return [];
 // ±10-min rain-presence windows; ending needs 3 consecutive frames and a preceding rain frame.
 const last = snapshot.eventType === 'RAIN_ENDING' ? 20 : 10;
 const times: string[] = [];
 for (let delta = -15; delta <= last; delta += 5) times.push(jmaTime(t + delta * 60000));
 return times;
}
export function evaluateReplay(snapshot: Snapshot, evidence: Evidence[], now: number) {
 const t = timestamp(snapshot.targetTime), decided = timestamp(snapshot.decidedAt);
 const invalid = (reason:string) => ({version:REPLAY_VERSION,metric:'RADAR_POINT_TRANSITION',exact:'INDETERMINATE' as Verdict,within5:'INDETERMINATE' as Verdict,within10:'INDETERMINATE' as Verdict,reason});
 if (t === null || decided === null || t < decided - 5*60000 || t > decided + 120*60000 || t % 300000 !== 0) return invalid('INVALID_TARGET_TIME');
 if (snapshot.eventType !== 'RAIN_ENDING' && !['RAIN_APPROACHING','ACTIONABLE_RAIN_APPROACHING','SEVERE_RAIN'].includes(snapshot.eventType)) return invalid('UNSUPPORTED_EVENT');
 const original = snapshot.forecast.find(f=>timestamp(f.validTime)===t);
 if(!original || timestamp(original.baseTime)===null || timestamp(original.baseTime)!>decided || timestamp(original.baseTime)!>t || original.status!==(snapshot.eventType==='RAIN_ENDING'?'NO_RAIN':'RAIN')) return invalid('INVALID_OR_MISSING_FORECAST_INPUT');
 const at = (time:number): string | null => {
  if (time > now) return null;
  const rows = evidence.filter(f => timestamp(f.validTime) === time);
  if (!rows.length || rows.some(f => f.kind !== 'OBSERVATION' || timestamp(f.baseTime) !== time || (timestamp(f.capturedAt) ?? -Infinity) < time || (timestamp(f.capturedAt) ?? Infinity) > now || !['RAIN','NO_RAIN'].includes(f.status ?? ''))) return null;
  return new Set(rows.map(f=>f.status)).size === 1 ? rows[0].status! : null;
 };
 const ending = snapshot.eventType === 'RAIN_ENDING';
 if(snapshot.eventType==='SEVERE_RAIN'){
  const severe=(v?:string|null)=>['30_TO_50','50_TO_80','GTE_80'].includes(v??'');
  if(!severe(original.intensityClass))return invalid('INVALID_SEVERE_FORECAST');
  const intensityAt=(time:number):string|null=>{
   if(time>now)return null;
   const rows=evidence.filter(f=>timestamp(f.validTime)===time);
   if(rows.length!==1||rows[0].kind!=='OBSERVATION'||timestamp(rows[0].baseTime)!==time||timestamp(rows[0].capturedAt)!<time||timestamp(rows[0].capturedAt)!>now||!['RAIN','NO_RAIN'].includes(rows[0].status??''))return null;
   return rows[0].status==='NO_RAIN'?'NO_RAIN':rows[0].intensityClass??null;
  };
  const windowSevere=(minutes:number):Verdict=>{
   const values=[] as (string|null)[];for(let d=-minutes;d<=minutes;d+=5)values.push(intensityAt(t+d*60000));
   return values.some(v=>severe(v))?'MATCH':values.some(v=>v===null)?'INDETERMINATE':'MISMATCH';
  };
  return {version:REPLAY_VERSION,metric:'RADAR_POINT_SEVERE_30',exact:windowSevere(0),within5:windowSevere(5),within10:windowSevere(10),reason:'SEVERE_THRESHOLD_30',rainAtTarget:at(t),missingTimes:requiredTimes(snapshot).filter(time=>intensityAt(timestamp(time)!)===null),groundTruth:'NOT_EVALUATED'};
 }
 // A stop is valid only with independently recorded pre-notification rain.
 const priorRain = snapshot.observation.some(f => f.status === 'RAIN' && timestamp(f.baseTime) === timestamp(f.validTime) && timestamp(f.validTime) !== null && timestamp(f.validTime)! <= decided && decided-timestamp(f.validTime)! <= 15*60000);
 if (ending && !priorRain) return invalid('NO_PRE_NOTIFICATION_RAIN');
 const check = (candidate:number): Verdict => {
  const times = ending ? [-5,0,5,10] : [-5,0];
  const states = times.map(d=>at(candidate+d*60000));
  if (states.some(s=>s===null)) return 'INDETERMINATE';
  return ending ? states[0]==='RAIN' && states.slice(1).every(s=>s==='NO_RAIN') ? 'MATCH':'MISMATCH' : states[0]==='NO_RAIN' && states[1]==='RAIN' ? 'MATCH':'MISMATCH';
 };
 const window = (minutes:number):Verdict => {
  const checks:Verdict[]=[]; for(let d=-minutes;d<=minutes;d+=5) checks.push(check(t+d*60000));
  return checks.includes('MATCH') ? 'MATCH' : checks.includes('INDETERMINATE') ? 'INDETERMINATE':'MISMATCH';
 };
 return {version:REPLAY_VERSION,metric:'RADAR_POINT_TRANSITION',exact:window(0),within5:window(5),within10:window(10),reason:'TRANSITION_AND_PERSISTENCE',rainAtTarget:at(t),missingTimes:requiredTimes(snapshot).filter(time=>at(timestamp(time)!)===null),groundTruth:'NOT_EVALUATED'};
}
