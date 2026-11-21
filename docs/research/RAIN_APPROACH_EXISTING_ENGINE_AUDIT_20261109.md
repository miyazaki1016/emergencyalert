# Source-code audit: feasibility of onset vs actionable split (2026-11-09)

Reviewed main-branch `lib/weather/rain/RainInterpretationEngine.ts`, `lib/weather/rain/toRainSemanticEvent.ts`, `supabase/functions/watch-rain/notificationDecision.ts`, and `supabase/functions/watch-rain/forecastEpisode.ts`.

**Important correction to proposed design:** Existing engine already explicitly distinguishes `firstRainTime` (first future frame with status RAIN) and `firstActionableRainTime` (earliest strong-rain frame, two adjacent 5_TO_10 frames, or three adjacent 1_TO_5 frames). `RAIN_AHEAD` is non-notifying, while `ACTIONABLE_RAIN` notifies only when actionable time is <=30 min away. Existing semantic event exports both `startsAt` and `actionableAt`. The gap is **not** lack of distinct timestamps. It is a deliberate notification threshold/persistence policy and possible mismatch of target semantics versus radar transition metric.

`forecastEpisodeDecision` suppresses repeated approaching alerts for an active forecast episode (`approachNotified`), and `shouldNotifyForRain` checks enabled, actionable urgency and last notification. Any candidate that notifies on `firstRainTime` must be replayed through the full episode state machine and suppression policy; otherwise it may consume the one approaching notification before rain becomes actionable.

**Safest candidate for offline study:** preserve original actionable notification and add a *non-sending informational signal* for weak rain onset; do not replace targetTime or advance approachNotified. Compare informational signal's validity and usefulness using the existing archived snapshots and independent observation frames, including negative cases. Do not introduce a second push notification without explicit product decision.

**Remaining work:** inspect full watch-rain/index.ts decision path and build test fixtures that replay snapshots with immutable historical state; evaluate false positives, misses, lead time and duplicate behavior. No production edits.
