# Muse independent review package — Amefuru rain timing (2026-11-09)

## Mission
Independently critique the existing Japanese high-resolution nowcast notification algorithm and propose **offline-only**, falsifiable improvements. Do not assume earlier notifications are better. Do not deploy, change Supabase, modify notification settings, or send pushes.

## Code to inspect (main branch)
- `lib/weather/rain/RainInterpretationEngine.ts`: current-vs-forecast state machine, rain onset, actionable onset, persistence and <=30-minute threshold.
- `lib/weather/rain/toRainSemanticEvent.ts`: maps firstRainTime to startsAt and firstActionableRainTime to actionableAt.
- `supabase/functions/watch-rain/forecastEpisode.ts`: active/clear episodes, three distinct clear forecasts, approachNotified latch.
- `supabase/functions/watch-rain/notificationDecision.ts`: legacy guard.
- `supabase/functions/watch-rain/index.ts`: push intents, durable idempotency, accepted delivery, episode state persistence.
- `supabase/functions/watch-rain/deliveryGuard.ts`: concurrency/idempotency.
- Existing unit tests alongside these files.

## Existing research
Read all `docs/research/RAIN_APPROACH_*_20261109.md` files on branch `research/rain-approach-timing-20261109` (draft PR #179). Some documents describe preliminary analyses; later evidence-tier audits supersede claims that all 329 evaluations have independent future observation images.

## Evidence and constraints
- 329 ACTIONABLE_RAIN_APPROACHING evaluation rows: 28 ACCEPTED (7 targets), 301 NO_SUBSCRIPTIONS (9 targets). Repeated evaluations of same rain are not independent episodes.
- Forecast firstRainTime earlier than firstActionableRainTime in 243/329; gap >=10m in 139/329.
- Existing within10 radar grade: ACCEPTED 17 MATCH / 11 MISMATCH; NO_SUBSCRIPTIONS 211 MATCH / 90 MISMATCH. This is a radar-based evaluation, **not independent ground-truth surface rainfall**.
- Future OBSERVATION image sets: only 28 ACCEPTED evaluations (168 frames, six each). The other 301 have decision-time snapshot.observation but **no archived future OBSERVATION image set**. Do not confuse the two.
- NO_SUBSCRIPTIONS means no push endpoint, **not** a weather-negative case.
- Historical alerts may be left-censored at observation-window start; do not infer precise onset from already rainy first image.
- Alert-episode latch may suppress a later actionable push if an earlier push consumes approachNotified.
- An offline-only informational onset signal that does not set approachNotified is the low-risk baseline.

## Requested independent deliverables
1. Diagram the current semantics and point out mismatches between user-facing '降り始め' vs '雨が続きそう' and the metric's target.
2. Propose at least three competing hypotheses: timing shift, episode selection, intensity/persistence threshold, data validity / spatial mismatch.
3. Specify a replay experiment with immutable original forecast snapshots, original decision timestamps, time-aligned observation frames, target/episode clustering, and **negative forecast decisions** (DRY and RAIN_AHEAD, not just sent notifications).
4. Define precision/recall, lead time, false alert, miss, episode duplication and suppression metrics, including denominators, uncertainty intervals and temporal holdout. State which cannot yet be computed.
5. Provide exact acceptance criteria before any production rollout and a rollback plan.
6. Return a ranked set of changes with assumptions, risks, and what extra data would falsify each hypothesis.

## Data protection and access
This package contains only aggregate numbers and source paths, no owner IDs, target IDs, coordinates, personal notification details, or image bytes. If Muse cannot access Supabase or private GitHub, use the exported summary and request a minimal de-identified dataset. Do not request credentials or infer user location from target labels.
