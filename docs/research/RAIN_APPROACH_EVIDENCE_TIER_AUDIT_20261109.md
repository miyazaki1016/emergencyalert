# Episode/ground-truth coverage audit and onset-gap stratification (2026-11-09)

Read-only SQL on 329 `ACTIONABLE_RAIN_APPROACHING` evaluation records, grouped by delivery status and existing `radar_result.within10` grade. All are COMPLETE evaluations but NOT independent episodes. Observation image storage coverage differs sharply:

| Delivery status | Evaluations | Targets | Archived OBSERVATION image sets | Images | Existing MATCH | Existing MISMATCH |
|---|---:|---:|---:|---:|---:|---:|
| ACCEPTED | 28 | 7 | 28 | 168 | 17 | 11 |
| NO_SUBSCRIPTIONS | 301 | 9 | 0 | 0 | 211 | 90 |

`image_state=PENDING` for all 301 NO_SUBSCRIPTIONS evaluations, although they have a computed radar grade. Thus **do not claim** they have archived independent observation image frames; the `snapshot.observation` array is the observation *at decision time*, not a future observation image series validating the target. Existing radar grades and image archives are different evidence tiers.

Gap from forecast `firstRainTime` to `firstActionableRainTime` by existing grade:

| Status | Grade | N | Gap >0 | Gap >=10 |
|---|---|---:|---:|---:|
| ACCEPTED | MATCH | 17 | 13 | 10 |
| ACCEPTED | MISMATCH | 11 | 10 | 6 |
| NO_SUBSCRIPTIONS | MATCH | 211 | 136 | 52 |
| NO_SUBSCRIPTIONS | MISMATCH | 90 | 84 | 71 |

The NO_SUBSCRIPTIONS subgroup has much higher frequency of a >=10m forecast onset/actionable gap among MISMATCH (71/90) than MATCH (52/211), an **association** worthy of an episode-level validation, not evidence that early notifications would fix mismatches. Accepted subgroup is small and does not show the same pattern. Repeated records from only 9 targets in NO_SUBSCRIPTIONS mean clustered dependence is severe.

**Next:** cluster by target and temporally contiguous rain forecast episodes (do not equate target with episode), stratify by date and image availability, compare only independently archived future observation images for the verified cohort, and treat radar-result-only grades separately. Do not infer actual rain from delivery status or initial snapshot observation. No production writes.
