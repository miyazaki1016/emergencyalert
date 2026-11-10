import {describe, expect, it} from 'vitest';
import {evaluateRainEpisodes as evaluate, type EpisodeEvidence} from '../lib/research/rainEpisodeEvaluation';
const episode = (patch: Partial<EpisodeEvidence> = {}): EpisodeEvidence => ({
  targetKey: 'target-a', episodeKey: 'episode-a', metric: 'ACTIONABLE', window: [0, 60],
  checksComplete: true, observationsComplete: true, truth: 'PRESENT', observedMinute: 30,
  checks: [{id: 'check-a', decidedMinute: 5, predictedMinute: 25, delivery: 'ACCEPTED'}], ...patch,
});
describe('offline episode denominators', () => {
  it('counts repeated forecasts once and reports extra accepted alerts separately', () => {
    const e = episode(); e.checks.push({...e.checks[0], id: 'check-b', decidedMinute: 10});
    const r = evaluate([e], 'ACTIONABLE');
    expect(r.prediction.tp).toBe(1); expect(r.delivery.tp).toBe(1);
    expect(r.rows[0]).toMatchObject({positiveChecks: 2, extraAcceptedChecks: 1, predictionErrorMinutes: -5, acceptedLeadMinutes: 25});
  });
  it('NO_SUBSCRIPTIONS is a positive weather prediction and a delivery miss', () => {
    const e = episode(); e.checks[0].delivery = 'NO_SUBSCRIPTIONS';
    const r = evaluate([e], 'ACTIONABLE'); expect(r.prediction.tp).toBe(1); expect(r.delivery.fn).toBe(1);
  });
  it('includes explicit negative checks as misses and true negatives', () => {
    const checks: EpisodeEvidence['checks'] = [{id: 'dry', decidedMinute: 5, predictedMinute: null, delivery: 'NOT_ATTEMPTED'}];
    const r = evaluate([episode({checks}), episode({episodeKey: 'dry-episode', checks, truth: 'ABSENT', observedMinute: null})], 'ACTIONABLE');
    expect(r.prediction).toMatchObject({fn: 1, tn: 1, recall: 0, precision: null});
  });
  it('counts a false alert only with complete independently labelled absence', () => {
    const r = evaluate([episode({truth: 'ABSENT', observedMinute: null})], 'ACTIONABLE');
    expect(r.prediction.fp).toBe(1); expect(r.delivery.fp).toBe(1);
  });
  it.each(['LEFT_CENSORED', 'RIGHT_CENSORED', 'UNKNOWN'] as const)('excludes %s from precision and recall', truth => {
    const r = evaluate([episode({truth, observedMinute: null})], 'ACTIONABLE');
    expect(r.predictionExcluded).toBe(1); expect(r.prediction.precision).toBeNull(); expect(r.delivery.recall).toBeNull();
  });
  it('does not turn missing observations or absent diagnostics into negatives', () => {
    for (const patch of [{observationsComplete: false}, {checksComplete: false}, {checks: []}]) {
      const r = evaluate([episode(patch)], 'ACTIONABLE'); expect(r.predictionExcluded).toBe(1);
    }
  });
  it('keeps uncertain delivery out of delivery metrics while retaining forecast metrics', () => {
    const e = episode(); e.checks[0].delivery = 'UNKNOWN';
    const r = evaluate([e], 'ACTIONABLE'); expect(r.prediction.tp).toBe(1); expect(r.deliveryExcluded).toBe(1);
  });
  it('separates onset, actionable and ending, and distinct episodes of the same target', () => {
    const r = evaluate([episode(), episode({metric: 'ONSET'}), episode({metric: 'ENDING'}), episode({episodeKey: 'episode-b'})], 'ACTIONABLE');
    expect(r.episodes).toBe(2); expect(r.prediction.tp).toBe(2);
  });
  it('rejects duplicate episode/check identifiers and invalid timestamps', () => {
    expect(() => evaluate([episode(), episode()], 'ACTIONABLE')).toThrow('EPISODE_KEY');
    const e = episode(); e.checks.push(e.checks[0]); expect(() => evaluate([e], 'ACTIONABLE')).toThrow('CHECK_ID');
    expect(() => evaluate([episode({observedMinute: 100})], 'ACTIONABLE')).toThrow('TRUTH_TIME');
    expect(() => evaluate([episode({window: [60, 0]})], 'ACTIONABLE')).toThrow('WINDOW');
  });
});
