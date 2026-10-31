import {describe,it,expect} from 'vitest';
import {evaluateReplay,makeSnapshot,requiredTimes,timestamp,jmaTime,type Snapshot,type Evidence} from '../supabase/functions/_shared/rainReplay';
import {bestEffort} from '../supabase/functions/_shared/replayRecording';
const t=Date.parse('2026-10-29T02:30:00Z');
function snapshot(ending=false):Snapshot {return makeSnapshot({eventType:ending?'RAIN_ENDING':'ACTIONABLE_RAIN_APPROACHING',decidedAt:'2026-10-29T02:10:00Z',latitude:35.6,longitude:139.8,title:'title',body:'body',rain:{event:{actionableAt:jmaTime(t),endingAt:jmaTime(t)},observation:[{baseTime:'20261029020500',validTime:'20261029020500',status:'RAIN'}],forecast:[{baseTime:'20261029020500',validTime:jmaTime(t),status:ending?'NO_RAIN':'RAIN'}]},previousState:{confirmed_weather:'RAINING'}})!;}
function frames(status:(delta:number)=>string,ending=false):Evidence[]{return requiredTimes(snapshot(ending)).map(validTime=>({kind:'OBSERVATION',baseTime:validTime,validTime,status:status((timestamp(validTime)!-t)/60000),capturedAt:'2026-10-29T03:00:00Z'}));}
const now=t+60*60000;
describe('notification replay',()=>{
 it('keeps exact and timing tolerance separate',()=>{const r=evaluateReplay(snapshot(),frames(d=>d>=5?'RAIN':'NO_RAIN'),now);expect(r.exact).toBe('MISMATCH');expect(r.within5).toBe('MATCH');expect(r.within10).toBe('MATCH');});
 it('does not call already raining a new start',()=>expect(evaluateReplay(snapshot(),frames(()=>'RAIN'),now).exact).toBe('MISMATCH'));
 it('requires three consecutive dry frames and preceding rain',()=>expect(evaluateReplay(snapshot(true),frames(d=>d<0?'RAIN':'NO_RAIN',true),now).exact).toBe('MATCH'));
 it('does not treat a one-frame gap as an ending',()=>expect(evaluateReplay(snapshot(true),frames(d=>d===0?'NO_RAIN':'RAIN',true),now).exact).toBe('MISMATCH'));
 it('needs pre-notification rain for ending',()=>{const s=snapshot(true);s.observation=[];expect(evaluateReplay(s,frames(()=> 'NO_RAIN',true),now).reason).toBe('NO_PRE_NOTIFICATION_RAIN');});
 it.each(['UNKNOWN_PIXEL','FETCH_ERROR','NO_DATA','OUT_OF_COVERAGE'])('treats %s as indeterminate',status=>{expect(evaluateReplay(snapshot(),frames(d=>d===0?status:'NO_RAIN'),now).exact).toBe('INDETERMINATE');});
 it('missing frames cannot be dry',()=>expect(evaluateReplay(snapshot(),[],now).exact).toBe('INDETERMINATE'));
 it('rejects forecast impersonating observation',()=>{const f=frames(d=>d>=0?'RAIN':'NO_RAIN');f.forEach(x=>x.baseTime='20261029020000');expect(evaluateReplay(snapshot(),f,now).exact).toBe('INDETERMINATE');});
 it('rejects future capture and unreached observation',()=>{expect(evaluateReplay(snapshot(),frames(d=>d>=0?'RAIN':'NO_RAIN'),t-1).exact).toBe('INDETERMINATE');});
 it('rejects conflicting duplicate frames',()=>{const f=frames(d=>d>=0?'RAIN':'NO_RAIN');f.push({...f.find(x=>x.validTime===jmaTime(t))!,status:'NO_RAIN'});expect(evaluateReplay(snapshot(),f,now).exact).toBe('INDETERMINATE');});
 it('rejects missing target and invalid calendar dates',()=>{const s=snapshot();s.targetTime=null;expect(evaluateReplay(s,[],now).reason).toBe('INVALID_TARGET_TIME');expect(timestamp('20260230000000')).toBeNull();});
 it('uses actual sent event type rather than semantic type',()=>{const s=makeSnapshot({eventType:'RAIN_ENDING',decidedAt:'2026-10-29T02:10:00Z',latitude:35,longitude:139,title:'',body:'',rain:{event:{actionableAt:'20261029022000',endingAt:'20261029023000'}},previousState:null})!;expect(s.targetTime).toBe('20261029023000');expect(s.targetTimeSource).toBe('endingAt');});
 it('includes severe notifications and snapshots input immutably',()=>{const rain={forecast:[{status:'RAIN'}],event:{actionableAt:jmaTime(t)}};const args={eventType:'SEVERE_RAIN',decidedAt:'2026-10-29T02:10:00Z',latitude:35,longitude:139,title:'',body:'',rain,previousState:null};expect(makeSnapshot({...args,severeTargetTime:jmaTime(t)})?.targetTime).toBe(jmaTime(t));const s=makeSnapshot({...args,eventType:'ACTIONABLE_RAIN_APPROACHING'})!;rain.forecast[0].status='NO_RAIN';expect(s.forecast[0].status).toBe('RAIN');});
 it('contains enough frames for all ending tolerance windows',()=>expect(requiredTimes(snapshot(true))).toHaveLength(8));
 it('isolates both thrown and returned recording errors',async()=>{let errors=0;expect(await bestEffort(async()=>{throw Error('DB')},()=>errors++)).toBeNull();expect(await bestEffort(async()=>({error:Error('DB')}),()=>errors++)).toBeNull();expect(errors).toBe(2);});
});

it("does not score a notification without original forecast evidence",()=>{const s=snapshot();s.forecast=[];expect(evaluateReplay(s,frames(d=>d>=0?"RAIN":"NO_RAIN"),now).reason).toBe("INVALID_OR_MISSING_FORECAST_INPUT");});

it('evaluates severe radar intensity at exact and tolerance windows',()=>{const severe=makeSnapshot({eventType:'SEVERE_RAIN',decidedAt:'2026-10-29T02:10:00Z',severeTargetTime:jmaTime(t),latitude:35,longitude:139,title:'',body:'',rain:{forecast:[{baseTime:'20261029020500',validTime:jmaTime(t),status:'RAIN',intensityClass:'30_TO_50'}]},previousState:null})!;const evidence=requiredTimes(severe).map(validTime=>({kind:'OBSERVATION' as const,baseTime:validTime,validTime,capturedAt:'2026-10-29T03:00:00Z',status:'RAIN',intensityClass:validTime===jmaTime(t+5*60000)?'50_TO_80':'10_TO_20'}));const result=evaluateReplay(severe,evidence,now);expect(result.exact).toBe('MISMATCH');expect(result.within5).toBe('MATCH');expect(result.within10).toBe('MATCH');});
