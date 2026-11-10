import {expect, it} from 'vitest';
import {advanceForecastEpisode, forecastEpisodeDecision, seedForecastEpisode} from '../supabase/functions/watch-rain/forecastEpisode';
import {advanceObservationStreak, nextLastNotifiedAt, nextRainEndingNotified} from '../supabase/functions/watch-rain/notificationDecision';
const initial = () => ({...seedForecastEpisode('episode', {last_notified_at: 'previous'}, false), clearForecasts: 2, lastForecastAt: '20261109001000'});
it('UNKNOWN without an issuance breaks clearing without releasing the approach latch', () => {
  expect(advanceForecastEpisode(initial(), 'UNKNOWN', null, 'new')).toMatchObject({clearForecasts: 0, active: true, approachNotified: true});
});
it('a newer UNKNOWN breaks clearing but same/older UNKNOWN is ignored by the current baseline', () => {
  expect(advanceForecastEpisode(initial(), 'UNKNOWN', '20261109001500', 'new').clearForecasts).toBe(0);
  for (const at of ['20261109001000', '20261109000500']) expect(advanceForecastEpisode(initial(), 'UNKNOWN', at, 'new')).toEqual(initial());
});
it('delivered zero preserves the legacy timestamp and ending flag independently of the episode latch', () => {
  expect(nextLastNotifiedAt({delivered: 0, actionable: true, previousLastNotifiedAt: 'previous', now: 'now'})).toBe('previous');
  expect(nextLastNotifiedAt({delivered: 0, actionable: true, now: 'now'})).toBeNull();
  expect(nextRainEndingNotified({previousRainEndingNotified: false, rainStreak: 3, endingDelivered: false})).toBe(false);
  expect(forecastEpisodeDecision(initial(), true, true, 0, false).notify).toBe(false);
});
it('ending eligibility is independent of the approach latch, with severe key priority', () => {
  expect(forecastEpisodeDecision(initial(), true, false, 0, true).key).toBe('episode/ENDING');
  expect(forecastEpisodeDecision(initial(), true, false, 1, true).key).toBe('episode/SEVERE');
  expect(forecastEpisodeDecision(initial(), false, false, 1, true).notify).toBe(false);
});
it('repeated or unknown observations cannot confirm dry weather or reset its streak', () => {
  const args = {status: 'NO_RAIN', validAt: '20261109001000', previousValidAt: '20261109001000', previousRainStreak: 0, previousClearStreak: 2};
  expect(advanceObservationStreak(args).clearStreak).toBe(2);
  expect(advanceObservationStreak({...args, status: 'UNKNOWN_PIXEL', validAt: '20261109001500'}).clearStreak).toBe(2);
  expect(advanceObservationStreak({...args, validAt: '20261109001500'}).clearStreak).toBe(3);
});
