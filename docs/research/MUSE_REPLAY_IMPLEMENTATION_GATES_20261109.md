# Muse 28-case replay: implementation readiness and safe next changes (2026-11-09)

Source: Muse's 8-page independent report, provided by project owner, and current main branch code audit. **Research only**; no deployment, database changes, or notification-policy changes.

## Findings confirmed from source
- `supabase/functions/_shared/rainReplay.ts`: `requiredTimes` collects −15 to +10 minutes around target for approaching events. `evaluateReplay` grades a **single point NO_RAIN→RAIN transition**, not onset/actionable separately. `RAIN_ENDING` uses a different persistence check.
- `supabase/functions/_shared/replayJma.ts`: production-mirrored palette exists; color classification is not a blocking issue for 168 archived point observations.
- `supabase/functions/_shared/replayAreaReader.ts`: area capture and lossless PNG/mask metadata already exist. **Reuse these components** instead of building a new raster parser.
- `supabase/functions/_shared/replayRecording.ts`: replay recording is best effort, intentionally non-blocking for notification delivery.
- Muse's reported 28-case outcomes: 13 onset and 9 actionable scoreable within ±10m; 13 left-censored at first frame; 2 point-dry cases (#17/#20). This is a small selected sample, not a claim of 100% forecast accuracy.

## Necessary design correction
Do not simply relabel existing `within10` or treat `1_TO_5` in a **single** observed frame as proof of the forecast's **three-consecutive-frame actionable threshold**. The reported offline actionable score uses first observed >=1 mm/h frame, a different persistence definition. Run *both* threshold-entry and sustained-3-frame scoring, labeling right-censored episodes explicitly. Missing or incomplete area mask must yield indeterminate, not dry.

## Recommended staged implementation (not yet applied)
1. **Pure offline grading module + tests**: `scoreOnset` with single-frame and optional two-frame persistence; `scoreActionable` with single-frame intensity entry and separate 3-consecutive >=1 mm/h persistence. Return `MATCH/MISMATCH/LEFT_CENSORED/RIGHT_CENSORED/INDETERMINATE` plus explicit evidence-window bounds. No pushes or DB writes.
2. **Data-collection plan**: expand observation window from decision time through target+30m *only for future cases*, after reviewing scheduled job, request counts, storage and retention. Historical missing observations cannot be reconstructed by changing a scheduler.
3. **Area/point parallel metrics**: leverage existing area PNG+mask and compute per-radius occupancy at 250/500/1000m, explicitly distinguish unavailable mask from true dry.
4. **Suppression telemetry**: record `push_intent`, `accepted_count`, `episode_latch_before/after`, `suppression_reason` with a non-identifying evaluation key. Keep idempotency intact; investigate how to log non-notification decisions without leaking personal target data.
5. **Episode clustering and temporal holdout**: derive independent episodes with stable pseudonymous IDs; keep targets and repeat evaluations clustered; use chronological split and confidence intervals. Include DRY/RAIN_AHEAD negatives.
6. **Only after replay** consider changing delivery/latch semantics; failed pushes and retry semantics need concurrency and duplicate-send tests.

## Acceptance gates
- Unit tests for onset/actionable threshold definitions, missing frames, left/right censoring, point/area disagreement, repeated valid times, unknown palette and incomplete area mask.
- Parity tests demonstrate legacy grade unchanged when new offline grading is enabled.
- Confirm no extra notification, no new episode latch consumption, no impact on existing delivery when recording fails.
- Measure image requests and storage before increasing observation cadence. Preserve no more than necessary; do not expose coordinates in research exports.
- Report denominators by scoreability and independent episodes, never use 28 evaluations as 28 independent rain events.

## Open technical questions
- Locate and inspect the scheduler/worker that populates `rain_evaluation_images`; determine whether extended historical observations are available and whether storage costs permit the proposed window.
- Define whether the product promises center-point rainfall or rain in a surrounding radius, then use that same definition for scoring.
- Reconcile `onset_lead_min` and `actionable_lead_min` with exact original snapshot fields (forecast semantics vs point observations), rather than attempting to derive them from the six future observation frames.
