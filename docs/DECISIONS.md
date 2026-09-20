# EmergencyAlert Decision Log

## 2026-09 — source of truth

EmergencyAlert does not independently forecast weather. Official/authorized
forecast, observation and disaster information is the source of truth.

## Rain notification v1

The initial lifestyle notification candidate is forecast rain intensity class
5 mm/h or greater within 30 minutes.

This is NOT a meteorological danger threshold. It is a configurable product
threshold intended to answer whether a person may want to act now (for example,
bringing laundry inside).

Rain below 5 mm/h may be shown in the app but does not normally trigger a push.

## Ending rain v1

Do not infer an ending from one zero frame. Require three consecutive valid
NO_RAIN frames (15 minutes at the normal 5-minute cadence). A missing,
unavailable or unknown frame breaks the run.

## Missing data

Never map NO_DATA, OUT_OF_COVERAGE, FETCH_ERROR or UNKNOWN_PIXEL to NO_RAIN.
Never interpolate a missing official frame.

## JMA PNG palette

The historical 2023 RGB palette is not treated as authoritative for 2026.
The current JMA documentation confirms the precipitation intensity product and
its thresholds, but the application must not silently assume an unverified
rendering palette. Until the palette is verified for the current tile product,
opaque unrecognised pixels remain UNKNOWN_PIXEL.

Future Sora: do not "fix" this by copying the 2023 colors without verification.
