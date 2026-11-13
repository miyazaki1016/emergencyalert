# 28 accepted observations: production-threshold parity replay (2026-11-09)

**Research only; no notification or DB changes.** Reclassified all 168 archived center RGBA frames with `replayJma.ts` palette and compared observed actionable onset with the original forecast `firstActionableRainTime` (`actionable_lead_min - target_lead_min`). Six-frame observation window is target−15m through target+10m.

The actual production engine uses the earliest of (a) one >=10mm/h frame, (b) two consecutive 5_TO_10 frames, or (c) three consecutive 1_TO_5 frames. This is **not** equivalent to three consecutive frames of any intensity >=1mm/h.

| Result | Count |
|---|---:|
| Observable actionable onset within ±10min | 5 |
| Observable actionable onset outside ±10min | 3 |
| No qualifying start, left boundary potentially already in a qualifying run | 7 |
| No qualifying start, right-censored by end of available observations | 13 |
| Total | 28 |

The 8 observable events (5 matches, 3 mismatches) are **not independent weather episodes**. All eight observed qualifying runs use 1_TO_5 persistence. Predicted actionable offset is 0m relative to target in all 28 rows. The three observed starts at −15m (#3, #4, #22) are 15m earlier than target and thus outside ±10m. Cases #5, #13, #19, #21, #28 are within tolerance. Left-censor classification here means **a qualifying run may have started before the archived first frame**; it does not prove that it did. No positive/negative rate can be inferred for the 20 censored cases.

**Muse reconciliation:** Muse's 9/9 actionable scoreable within ±10m uses a **first-frame threshold-entry** definition, not this production-matched persistence. It is therefore not a contradictory result about the same metric. The onset disagreement (7/13 vs Muse 13/13) is separately documented in `OFFLINE_ONSET_SIX_DISAGREEMENTS_20261109.md`; Muse's exact case-by-case onset reference has not yet been supplied. Do not claim either estimate is definitive.

**Code:** `lib/weather/rain/offlineProductionParity.ts`, `tests/offlineProductionParity.test.ts`. An additional experimental scorer `offlineRainGrading.ts` uses generic 3-frame >=1mm/h and must **not** be described as production parity. CI run 42567814692 was still in progress when first inspected; verify latest head before claiming all tests pass.

**Data limitations:** only center-pixel radar, six 5-minute observation frames, no surface rain gauge, no full negative cohort, repeated target groups, potential left/right censoring, no stable independent episode IDs. A center pixel being dry is not proof a surrounding rain area was dry. Extend evidence window and score per episode before changing notification logic.
