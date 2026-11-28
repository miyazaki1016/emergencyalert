import {describe,it,expect} from 'vitest';
import {productionEquivalentActionable as score,type Class} from '../lib/weather/rain/offlineProductionParity';
const seq=(...intensities:Class[])=>intensities.map((intensity,i)=>({minute:i*5,intensity}));
describe('research-only production threshold parity',()=>{
 it('strong >=10mm/h requires one frame',()=>expect(score(seq('DRY','10_TO_20')).rule).toBe('STRONG_SINGLE'));
 it('moderate 5-10mm/h requires two consecutive frames',()=>expect(score(seq('DRY','5_TO_10','5_TO_10')).rule).toBe('MODERATE_TWO'));
 it('light 1-5mm/h requires three consecutive frames',()=>expect(score(seq('DRY','1_TO_5','1_TO_5','1_TO_5')).rule).toBe('LIGHT_THREE'));
 it('one isolated light frame is not actionable',()=>expect(score(seq('DRY','1_TO_5','DRY')).state).toBe('RIGHT_CENSORED'));
 it('mixed light and moderate do not form one sustained class run',()=>expect(score(seq('DRY','1_TO_5','5_TO_10','1_TO_5')).state).toBe('RIGHT_CENSORED'));
 it('selects earliest qualifying candidate across classes',()=>expect(score(seq('DRY','1_TO_5','1_TO_5','1_TO_5','10_TO_20')).minute).toBe(5));
 it('unknown is indeterminate',()=>expect(score(seq('DRY','UNKNOWN')).state).toBe('INDETERMINATE'));
 it('already rainy first frame with no qualifying run is left-censored',()=>expect(score(seq('1_TO_5','DRY')).state).toBe('LEFT_CENSORED'));
});
