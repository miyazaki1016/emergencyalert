# Muse replay export — 2026-11-09

**Prepared from live Supabase read-only SQL, exported to research branch only. No production code, database or deployment changes.**

This is a **privacy-minimized 28-evaluation starter dataset**, not a complete diagnostic-history export or a dataset of independent rain episodes. It covers ACCEPTED ACTIONABLE_RAIN_APPROACHING evaluations only. All absolute timestamps, coordinates, place names, owner IDs, target UUIDs, push addresses, and notification text are omitted. `case` is an ordinal (1–28) shared across files; `target_group` is a synthetic ordinal grouping within this export, not a stable external identifier. Relative times are rounded minutes.

## Files
- `muse_accepted_observations_1_14_20261109.json` and `muse_accepted_observations_15_28_20261109.json`: 28 cases, original radar grade, lead times, six future observation frames per evaluation, center pixel RGBA.
- `muse_forecast_1_7_20261109.json`, `muse_forecast_8_14_20261109.json`, `muse_forecast_15_21_20261109.json`, `muse_forecast_22_28_20261109.json`: original decision-time forecast frame status and intensity class with offsets from decision time.
- `muse_diagnostics_1_14_20261109.json` and `muse_diagnostics_15_28_20261109.json`: diagnostic current point status/event in a bounded window around each case, with checked-time and source-valid-time offsets separately.

## Interpretation
- Join all files by `case`. Future observation offsets are relative to `target_time`; forecast offsets are relative to `created_at`. To align: `observation_offset_from_decision = target_lead_min + observation_offset_from_target`.
- `center_rgba` is an **unclassified pixel color**; do not infer intensity without the verified JMA color legend/decoder. Do not treat point radar as ground-level truth.
- Forecast frames and diagnostic status may reflect different radar issues. Diagnostic checked-time and source-valid-time are deliberately separate.
- Repeated case rows can describe one rain episode. `target_group` is **not** an episode identifier.
- Left-censored observation windows, unknown onset, and missing independent negative decisions must remain explicitly unknown.
- No full NO_SUBSCRIPTIONS cohort or DRY/RAIN_AHEAD decisions are in this export. Thus false-positive/recall and robust episode-level comparison cannot be computed from these files alone.
- Never send a notification or alter the production latch based on this dataset.

## Muse requested output
1. Validate whether the two target definitions (onset vs actionable) can be scored using these actual six-frame series.
2. List the number of evaluable, censored and missing cases, and explain any required color-decoding dependencies.
3. Test code-level latch hypotheses without claiming complete negative-decision coverage.
4. Specify precisely what additional de-identified fields are required for full replay.
