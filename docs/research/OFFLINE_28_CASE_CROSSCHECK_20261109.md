# 28-case offline regrading cross-check — 2026-11-09

**Scope:** the two privacy-minimized observation exports in this research branch (28 ACCEPTED approaching evaluations, 6 center-point frames each). This is a separate source-alignment check, not a substitute for Muse's original replay or independent rain ground truth. No production change.

## Data transformation
- Observed RGBA colors were mapped with the production mirror `supabase/functions/_shared/replayJma.ts`: transparent→DRY, LT_1→WEAK, >=1 mm/h→ACTIONABLE.
- Observation offsets are from notification `target_time`; `onset_lead_min` and `actionable_lead_min` are relative to evaluation `created_at`. Predicted onset offset from target = `onset_lead_min - target_lead_min`; predicted actionable offset = `actionable_lead_min - target_lead_min`.
- Observed onset = first consecutive five-minute DRY→(WEAK|ACTIONABLE) transition; observed sustained actionable = first non-actionable→ACTIONABLE transition followed by 3 contiguous ACTIONABLE samples (15 min total). Tolerance ±10 min.
- A series already wet at its first frame is LEFT_CENSORED for that metric. A series with no fully observable qualifying transition is RIGHT_CENSORED, **not** evidence of a miss.

## Exploratory results
| Metric | MATCH | MISMATCH | LEFT_CENSORED | RIGHT_CENSORED |
|---|---:|---:|---:|---:|
| Onset, 1 frame | 7 | 6 | 13 | 2 |
| Actionable, 3 contiguous frames | 4 | 0 | 6 | 18 |

These **do not reproduce Muse's stated 13/13 onset matches**. That discrepancy requires review of the exact definition of predicted onset timestamp and the handling of the earliest observed transition; do not silently replace Muse's result or assume the discrepancy is an algorithm defect. The stronger three-frame actionable condition is also **not equivalent** to Muse's first >=1 mm/h-frame scoring. For actionable, the six-frame window is too short to establish a persistent onset in 18 cases.

## CI verification
GitHub CI run 42564478680 confirmed `tests/offlineRainGrading.test.ts` **9 passed**. Entire CI failed because `tests/rainLabGrade.test.ts` used `node:test` and Vitest reported “No test suite found”. That test file was changed to import `test` from `vitest` in commit 92796b67fe4d4cc7743f0e25049f7ab5fe0e11c5. A subsequent CI run 42564655005 was in progress at inspection time; final pass not yet confirmed.

## Next validation
1. Audit 6 onset mismatches against raw original `snapshot.interpretation.firstRainTime`, valid-time timezone handling, and Muse's exact prediction-time alignment; calculate deltas case by case.
2. Extend future observation coverage only after checking scheduler/storage/retention budgets.
3. Add explicit observed evidence timestamps, unknown/missing-frame semantics and separate threshold-entry vs 3-frame persistence grades.
4. Do not change notifications, retry or episode latch on these results.
