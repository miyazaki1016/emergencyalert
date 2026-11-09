# Rain notification accuracy baseline — 2026-11-09

## Verified Work handoff (not independently reproduced in this document)
- 483 delivery rows preserved; 748 evaluation rows, 738 finalized and 10 awaiting observation.
- 434 historical deliveries lack sufficient original forecast input for retrospective verification; preserve them.
- 20 dangling evaluation notification references cleared; 10 observations supplemented; 0 rows deleted.
- 49 directly linked deliveries: approaching 20 (exact 10%, ±5m 40%, ±10m 65%), ending 26 (15.4%, 26.9%, 50%), severe 3 (33.3%, 33.3%, 66.7%).
- Metrics are **radar agreement**, not confirmed ground truth. No live notification logic or Vercel deployment changed.

## Code inspection
- `watch-rain/notificationDecision.ts`: `advanceObservationStreak` increments only on fresh observation validAt; `nextLastNotifiedAt` changes only for delivered notifications.
- `watch-rain/forecastEpisode.ts`: `forecastSignal` returns UNKNOWN without fresh, complete interpretable forecast; `advanceForecastEpisode` requires three distinct CLEAR forecasts before reset. `forecastEpisodeDecision` prioritizes severe, then ending, then approaching in notification key.
- Investigate the distinction between observation-based ending eligibility and forecast-based episode clearing before any change. Avoid conflating repeated polls with independent weather observations.

## Safe next experiment (no production changes)
1. Capture a read-only, timestamped baseline of finalized delivered evaluations, separated by event and by target; never mix unissued candidate evaluations into delivered accuracy.
2. Extract existing fixture cases for ending false positives, early/late alerts and forecast flip-flops. Preserve raw source validAt and evaluation target time.
3. Implement and test an offline replay of current logic; verify baseline equivalence first.
4. Compare one isolated candidate ending gate against current behavior with paired events and false-negative counts. Do not optimize only the ±10-minute match rate.
5. Review edge cases: stale/UNKNOWN frames, repeated source validAt, nighttime observations, and notification idempotency.
6. Only after review and explicit approval, propose production changes. No Vercel builds or deployments from this research branch.

## Pending data work
- Revisit 10 observation-pending evaluations when settled.
- Preserve 434 non-reconstructable historical deliveries and 20 missing historical deliveries as documented limitations.
- Do not fabricate reconstructed forecasts or ground truth.
