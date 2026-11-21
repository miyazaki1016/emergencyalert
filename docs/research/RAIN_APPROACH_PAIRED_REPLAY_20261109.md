# Paired offline observation replay — 2026-11-09

Scope: 20 actually delivered ACTIONABLE_RAIN_APPROACHING evaluations, six OBSERVATION frames each, read-only database queries. Baseline ±10-minute radar grade: 13 MATCH, 7 MISMATCH.

Define point intensity classes: 0=transparent/dry, 1=LT_1 (<1 mm/h), 2=other nontransparent rain (>=1 mm/h for the observed palette). Scan consecutive observed frames for (A) 0→positive rain onset and (B) 1→2 strengthening. A transition that predates the first available observation is **left-censored** and cannot be timed from this window.

| Baseline grade | N | Observed 0→rain transition somewhere in six frames | Observed weak→>=1 transition | First frame >=1 | First frame weak | First frame dry |
|---|---:|---:|---:|---:|---:|---:|
| MATCH | 13 | 13 | 2 | 1 | 1 | 11 |
| MISMATCH | 7 | 0 | 2 | 4 | 2 | 1 |

An observed 0→rain transition may occur *after* an earlier rainy frame, so this is an occurrence count, not proof of first onset. Observed onset equals predicted firstRainTime for 2/13 baseline MATCH and 0/7 baseline MISMATCH. Observed strengthening equals predicted firstActionableRainTime for 0/13 MATCH and 1/7 MISMATCH. These are NOT new accuracy percentages: many cases have no observable transitions, and the original grading uses persistence windows and ±10-minute tolerance rather than exact point transitions.

**Finding:** separating the two transition types is feasible, but the available 30-minute observation windows are insufficient to fairly calculate candidate accuracy or false-negative cost. A point-class threshold or coverage percentage cannot be tuned from these data alone.

**Next implementation prerequisite:** obtain longer contiguous observation history (including pre-window dry/weak state), define minimum persistence, then replay every delivered and suppressed candidate with identical time windows; report coverage and unknown cases explicitly. No production code or data mutations.
