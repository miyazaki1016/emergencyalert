# Source-valid-time-aligned exploratory replay (2026-11-09)

Read-only 20 actually delivered approaching-rain cases, 90 minutes before to 20 minutes after target. Diagnostic rows deduplicated by (evaluation id, source_valid_at), keeping latest checked_at. Ordered by source_valid_at, identified NO_RAIN→RAIN transitions. A **provisional persistence proxy** requires the *next available diagnostic sample* also be RAIN. This is NOT proof of consecutive 5-minute rain or identical rain episode: gaps, duplicate sources, and weak-intensity transitions remain unverified.

- Deduplicated series yielded 26 dry→rain transitions across 13 baseline MATCH cases and 11 across 6 of 7 MISMATCH cases (multiple episodes).
- Selecting nearest target-time transition satisfying next-sample-rain proxy:
  - MATCH: 7/13 cases had eligible transitions; 6 within ±10 min, 1 early (−70 min); 6/13 lacked eligible transition.
  - MISMATCH: 6/7 had eligible transitions; 1 within ±10 min, 5 early (−15 to −20 min); 1/7 lacked eligible transition.
- Nearest deltas in minutes MATCH: [-70,-10,-10,-5,-5,0,+5]; MISMATCH: [-20,-15,-15,-15,-15,-10].

**Key caveats:** diagnostic point status is not independently stored radar OBSERVATION imagery; source_valid_at is aligned but not necessarily identical to image evaluation sampling; selecting the nearest transition can select a different rain episode; next-sample persistence can hide missing frames; overlapping notification windows can double-count same weather episode. Do not interpret these counts as a new forecast accuracy estimate.

**Recommendation:** add an offline read-only episode replay with 5-minute adjacency validation, intensity threshold and forecast/observation alignment, deduplication across overlapping alerts, explicit censoring and missing-frame classifications. Compare alerts suppressed by a proposed guard against useful alerts. No production mutation or deploy.
