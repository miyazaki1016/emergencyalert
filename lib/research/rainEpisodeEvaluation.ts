/** Offline episode accounting only. Never imported by notification dispatch.
 * Episode boundaries and absence labels require reviewed, independent evidence;
 * neither target identity nor delivery status can establish a weather episode.
 */
export type EpisodeMetric = 'ONSET' | 'ACTIONABLE' | 'ENDING';
export type EpisodeCheck = {
  id: string;
  decidedMinute: number;
  predictedMinute: number | null;
  delivery: 'ACCEPTED' | 'NO_SUBSCRIPTIONS' | 'FAILED' | 'UNKNOWN' | 'NOT_ATTEMPTED';
};
export type EpisodeEvidence = {
  targetKey: string;
  episodeKey: string;
  metric: EpisodeMetric;
  window: [number, number];
  checksComplete: boolean;
  observationsComplete: boolean;
  truth: 'PRESENT' | 'ABSENT' | 'LEFT_CENSORED' | 'RIGHT_CENSORED' | 'UNKNOWN';
  observedMinute: number | null;
  checks: EpisodeCheck[];
};
type Counts = {tp: number; fp: number; fn: number; tn: number};
const counts = (): Counts => ({tp: 0, fp: 0, fn: 0, tn: 0});
const rates = (c: Counts) => ({...c,
  precision: c.tp + c.fp ? c.tp / (c.tp + c.fp) : null,
  recall: c.tp + c.fn ? c.tp / (c.tp + c.fn) : null,
});

/** Inputs use one shared time origin per episode, never offsets from each alert.
 * A negative prediction is an explicit checked decision (predictedMinute=null).
 * Unknown/censored or incomplete episodes remain visible outside denominators.
 */
export function evaluateRainEpisodes(episodes: EpisodeEvidence[], metric: EpisodeMetric) {
  const prediction = counts(), delivery = counts();
  const seen = new Set<string>();
  const rows = episodes.filter(e => e.metric === metric).map(e => {
    const key = JSON.stringify([e.targetKey, e.episodeKey, e.metric]);
    if (!e.targetKey || !e.episodeKey || seen.has(key)) throw Error('DUPLICATE_OR_MISSING_EPISODE_KEY');
    seen.add(key);
    const [start, end] = e.window;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw Error('INVALID_WINDOW');
    const ids = new Set<string>();
    for (const c of e.checks) {
      if (!c.id || ids.has(c.id)) throw Error('DUPLICATE_OR_MISSING_CHECK_ID');
      ids.add(c.id);
      if (!Number.isFinite(c.decidedMinute) || c.decidedMinute < start || c.decidedMinute > end ||
          (c.predictedMinute !== null && (!Number.isFinite(c.predictedMinute) || c.predictedMinute < start || c.predictedMinute > end))) throw Error('INVALID_CHECK_TIME');
      if (c.delivery === 'ACCEPTED' && c.predictedMinute === null) throw Error('ACCEPTED_WITHOUT_PREDICTION');
    }
    if ((e.truth === 'PRESENT' && (e.observedMinute === null || !Number.isFinite(e.observedMinute) || e.observedMinute < start || e.observedMinute > end)) ||
        (e.truth !== 'PRESENT' && e.observedMinute !== null)) throw Error('INVALID_TRUTH_TIME');
    const positives = e.checks.filter(c => c.predictedMinute !== null);
    const accepted = positives.filter(c => c.delivery === 'ACCEPTED');
    const reason = !e.checksComplete || !e.checks.length ? 'INCOMPLETE_CHECK_HISTORY'
      : !e.observationsComplete ? 'INCOMPLETE_OBSERVATIONS'
      : e.truth !== 'PRESENT' && e.truth !== 'ABSENT' ? e.truth : null;
    const add = (c: Counts, positive: boolean) => { c[e.truth === 'PRESENT' ? positive ? 'tp' : 'fn' : positive ? 'fp' : 'tn']++; };
    if (!reason) add(prediction, positives.length > 0);
    // An uncertain push cannot establish either a delivered alert or its absence.
    const deliveryReason = reason ?? (e.checks.some(c => c.delivery === 'UNKNOWN') ? 'UNCERTAIN_DELIVERY' : null);
    if (!deliveryReason) add(delivery, accepted.length > 0);
    const first = [...positives].sort((a, b) => a.decidedMinute - b.decidedMinute || a.id.localeCompare(b.id))[0];
    const firstAccepted = [...accepted].sort((a, b) => a.decidedMinute - b.decidedMinute || a.id.localeCompare(b.id))[0];
    return {targetKey: e.targetKey, episodeKey: e.episodeKey, reason, deliveryReason,
      positiveChecks: positives.length, acceptedChecks: accepted.length,
      extraAcceptedChecks: Math.max(0, accepted.length - 1),
      // Signed error and lead are meaningful only with a scoreable observed event.
      predictionErrorMinutes: !reason && e.truth === 'PRESENT' && first ? first.predictedMinute! - e.observedMinute! : null,
      acceptedLeadMinutes: !deliveryReason && e.truth === 'PRESENT' && firstAccepted ? e.observedMinute! - firstAccepted.decidedMinute : null,
    };
  });
  return {metric, episodes: rows.length, prediction: rates(prediction), delivery: rates(delivery),
    predictionExcluded: rows.filter(r => r.reason !== null).length,
    deliveryExcluded: rows.filter(r => r.deliveryReason !== null).length, rows};
}
