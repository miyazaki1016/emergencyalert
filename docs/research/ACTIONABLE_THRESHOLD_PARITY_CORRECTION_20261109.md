# Correction: actionable is NOT uniformly 3 consecutive >=1mm/h (2026-11-09)

Source audit: `lib/weather/rain/RainInterpretationEngine.ts` (main branch) shows **three competing actionable rules**:
1. **Strong**: one >=10mm/h frame (10_TO_20 or above).
2. **Moderate**: two consecutive five-minute frames **both 5_TO_10**.
3. **Light**: three consecutive five-minute frames **all 1_TO_5**.

The earliest qualifying start is chosen. Therefore prior research descriptions claiming production requires “three consecutive >=1mm/h frames” are **incorrect**, and `lib/weather/rain/offlineRainGrading.ts` with `persistence:3` is an **experimental sustained-intensity metric, not production parity**. Do not use its actionable results to assess production accuracy. The earlier 4 MATCH / 18 RIGHT_CENSORED / 6 LEFT_CENSORED values are experimental, not a replay of the production rules.

Added `lib/weather/rain/offlineProductionParity.ts` and `tests/offlineProductionParity.test.ts` to model and test the three actual intensity-specific rules. No push integration, database writes, or production code changes.

Also note `firstRainTime` is the first future forecast frame with `status=RAIN`, whereas `firstActionableRainTime` is the earliest qualifying actionable candidate. A Muse result that uses actionable time to grade weak onset is not directly comparable to the original `firstRainTime`. The six onset discrepancies documented separately remain conditional on the onset lead fields' meaning.

Next: run CI, then replay the 28 exported observations using this parity module and compare original forecast `firstActionableRainTime` with observation-derived actionable time. The six-frame window can cause left/right censoring and must not be scored as false positive.
