# Counterfactual uniform time shift — exploratory only (2026-11-09)

Using 20 delivered ACTIONABLE_RAIN_APPROACHING evaluations, 90-minute diagnostic context, deduplicated by source_valid_at and requiring 5-minute adjacency of two RAIN status samples after a NO_RAIN→RAIN transition. Choose transition nearest original target time, then compute whether it would lie within ±10 min of a *hypothetically earlier* predicted target.

Only 13/20 cases have eligible transitions (7 baseline MATCH, 6 baseline MISMATCH). Remaining 7 are **unknown**, not failures or successes. This is diagnostic point-status proxy, not original independent radar/persistence scoring. No suppressed alerts, ground truth, or delivery-time feasibility modeled.

| Uniform earlier target | Eligible baseline MATCH 7: proxy within10 | Eligible baseline MISMATCH 6: proxy within10 | Combined eligible 13 |
|---|---:|---:|---:|
| 0 minutes | 6 | 1 | 7 |
| 5 minutes | 6 | 5 | 11 |
| 10 minutes | 5 | 6 | 11 |
| 15 minutes | 4 | 6 | 10 |

**Not a forecast accuracy estimate.** Post-hoc choice of nearest observed transition and candidate time-shift tuning on same sample causes selection bias; different rain episodes may be conflated. Shifting target earlier does not mean the app could issue that alert earlier with information available at the original decision time. A fixed shift is **not recommended** on this evidence.

Next: verify forecast issuance timestamps and feasible lead times; test on holdout observations with original model frozen; include suppressed candidates and false positives, then compare episode-aware onset/strengthening semantics. No code/deploy/database mutation.
