import {describe,it,expect} from 'vitest';
import {scoreOnset,scoreActionable,type RainClass,type RainSample} from '../lib/weather/rain/offlineRainGrading';
const seq=(...v:RainClass[]):RainSample[]=>v.map((rain,i)=>({minute:i*5,rain}));
describe('offline rain grading (not connected to notification delivery)',()=>{
 it('separates weak onset from actionable persistence',()=>{
  const data=seq('DRY','WEAK','WEAK','ACTIONABLE','ACTIONABLE','ACTIONABLE');
  expect(scoreOnset(data,5).grade).toBe('MATCH');
  expect(scoreActionable(data,15).grade).toBe('MATCH');
  expect(scoreActionable(data,5).deltaMinutes).toBe(10);
 });
 it('reports left censoring instead of an invented late onset',()=>expect(scoreOnset(seq('WEAK','ACTIONABLE','ACTIONABLE'),10).grade).toBe('LEFT_CENSORED'));
 it('requires three contiguous actionable frames',()=>expect(scoreActionable(seq('DRY','ACTIONABLE','ACTIONABLE','DRY','ACTIONABLE','ACTIONABLE','ACTIONABLE'),20).observedMinute).toBe(20));
 it('does not claim a sustained onset when the window ends',()=>expect(scoreActionable(seq('DRY','ACTIONABLE','ACTIONABLE'),5).grade).toBe('RIGHT_CENSORED'));
 it('marks unknown pixel as indeterminate',()=>expect(scoreOnset(seq('DRY','UNKNOWN','DRY'),5).grade).toBe('INDETERMINATE'));
 it('rejects contradictory duplicate valid times',()=>expect(scoreOnset([{minute:0,rain:'DRY'},{minute:0,rain:'WEAK'}],0).grade).toBe('INDETERMINATE'));
 it('does not bridge a missing 5-minute frame',()=>expect(scoreOnset([{minute:0,rain:'DRY'},{minute:10,rain:'WEAK'}],10).grade).toBe('RIGHT_CENSORED'));
 it('keeps actionable-only grade distinct from onset grade',()=>expect(scoreActionable(seq('DRY','WEAK','WEAK','WEAK'),5).grade).toBe('RIGHT_CENSORED'));
 it('reports mismatch outside tolerance',()=>expect(scoreOnset(seq('DRY','DRY','DRY','WEAK'),0).grade).toBe('MISMATCH'));
});
