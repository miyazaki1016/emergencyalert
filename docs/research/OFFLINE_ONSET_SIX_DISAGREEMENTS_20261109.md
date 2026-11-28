# Six onset disagreements: case-by-case time alignment (2026-11-09)

Crosschecked the **same** de-identified accepted 28-case observation exports, using `predicted_onset_offset_from_target = first_rain_lead_min - target_lead_min`. The observations below use the **first dry→non-dry center-pixel transition** in the six-frame sequence (−15,−10,−5,0,+5,+10 minutes relative to target). Colors decoded with `replayJma.ts` production palette.

| Case | Target group | Predicted onset relative target | First observed onset relative target | Observed minus predicted | Observed class at onset | Legacy grade |
|---|---:|---:|---:|---:|---|---|
| 6 | 5 | −15m | 0m | +15m | 1_TO_5 | MATCH |
| 7 | 5 | −10m | +5m | +15m | 1_TO_5 | MATCH |
| 8 | 5 | −5m | +10m | +15m | 1_TO_5 | MATCH |
| 15 | 3 | −10m | +10m | +20m | LT_1 | MATCH |
| 23 | 1 | −10m | +5m | +15m | LT_1 | MATCH |
| 27 | 3 | −15m | +5m | +20m | LT_1 | MATCH |

**Finding:** All six onset mismatches are **observed onset later than the snapshot's forecast `firstRainTime` by 15–20 minutes**, under this particular definition. No timezone or sign-conversion issue is needed to explain the six: the offsets are internally consistent. All six have a legacy `MATCH` because that grade measures a *different target/transition*, not the predicted onset timestamp. These are six **evaluations**, not necessarily six distinct rain events; groups 5 and 3 repeat.

**Why this conflicts with Muse's “13/13 within ±10m”**: The 13 scoreable onset cases from the exported 28 are 7 MATCH and 6 MISMATCH with this exact snapshot `firstRainTime` definition. Muse's 13/13 claim must be reconciled against the exact prediction field and event-selection rule used in Muse's report; it cannot be treated as validated against `snapshot.interpretation.firstRainTime` without the missing per-case derivation. No proof that Muse is wrong; its grading might have compared against `actionableAt`, a different event or another temporal anchor.

**Critical methodological limitation:** The observation window starts at target−15m. A predicted onset at −15m is at the left boundary; if observed dry then, a subsequent transition is genuinely later in the observed point series, but the center-pixel radar is not ground-level rain truth. Some observations have a single rainy frame, so they do not prove sustained rainfall.

**Next:** ask Muse for its 13-case per-row forecast onset timestamps, observed transition timestamps and formula, then rerun identical definition; add longer pre-target observation windows and episode clustering before any claim of accuracy improvement. No production or notification changes.
