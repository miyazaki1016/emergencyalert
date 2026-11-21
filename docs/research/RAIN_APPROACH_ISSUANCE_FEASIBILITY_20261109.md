# Forecast issuance feasibility audit (2026-11-09)

Read-only inspection of 20 actually delivered ACTIONABLE_RAIN_APPROACHING evaluation snapshots. Unlike the post-hoc observation-only time shift, these snapshots preserve the **original forecast interpretation available at decision time**.

- Original targetTimeSource is actionableAt in inspected cases; evaluate full implementation before assuming this is universal.
- Baseline MATCH (13): target lead 5–30 min from evaluation created_at; 11 have at least a strict 5-min lead, 8 at least 10-min, 8 at least 15-min.
- Baseline MISMATCH (7): target lead 25–30 min; all 7 have at least 5/10/15-min lead.
- Forecast firstRainTime precedes firstActionableRainTime in 10/13 MATCH and 6/7 MISMATCH; equal in 3/13 and 1/7.
- Original forecast firstRain→firstActionable gap:
  - MATCH: 0m×3, 5m×3, 10m×4, 15m×2, 20m×1.
  - MISMATCH: 0m×1, 5m×4, 10m×1, 15m×1.

**Critical distinction:** a target timestamp being >=5 minutes after created_at makes a hypothetical earlier *target* possible, but does not prove an earlier *notification* could have been sent. We have not replayed alert trigger logic, suppression rules, duplicate guards, lead-time eligibility, or false positives; the forecast is not ground truth. Earlier firstRainTime is a candidate semantic trigger to evaluate offline, not a validated replacement.

Next: run original and candidate decisions from the same immutable snapshot, with identical eligibility and duplicate-guard logic, and compare against independently archived radar observations including unnotified cases. No changes to production or database.
