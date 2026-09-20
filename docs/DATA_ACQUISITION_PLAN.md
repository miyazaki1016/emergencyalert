# Data acquisition plan

## Current decision — zero fixed data cost

EmergencyAlert 2026 will be developed with **no paid weather-data subscription**
for now.

The paid JMBSC GRIB2 route is preserved as a future upgrade path, not a Phase 1
dependency. Reconsider it only when the project has revenue/funding that makes
the recurring cost reasonable.

## What JMA makes publicly available

JMA's developer guide states that precipitation-nowcast imagery can be obtained
from the JMA website. The information catalogue identifies the high-resolution
precipitation nowcast analysis and forecast images as PNG, updated every five
minutes and covering up to one hour.

Therefore Phase 1 uses the public JMA image product for development and the
first working experience.

## Safety boundary

Free does not mean guessed.

- Never invent meteorological values.
- Never convert NO_DATA, FETCH_ERROR, OUT_OF_COVERAGE or UNKNOWN_PIXEL to dry.
- Keep raw RGBA, frame times, tile/pixel coordinates and source visible in
  Developer View.
- Do not present an exact mm/h value unless the mapping is verified.
- If the current PNG palette cannot be verified strongly enough, use only
  interpretations that the verified public product supports, or display the
  raw/visual state without an unsupported numeric claim.
- JMA itself notes that radar/nowcast display can be missing, weaker than
  reality, or show precipitation where none exists; UI language must remain
  appropriately cautious.

## Phase 1 path

Browser location
  -> public JMA target times
  -> public JMA high-resolution nowcast PNG
  -> Web Mercator tile/pixel
  -> conservative pixel classification
  -> RainInterpretationEngine (only when inputs are verified)
  -> UI + Developer View

No DB, paid feed, AI-generated forecast, or Push is required to prove this
chain.

## Future paid path — parked

JMBSC GRIB2 remains behind the existing provider interface. It can later replace
or augment the public-image adapter without rewriting the product logic.

Do not spend recurring money on this feed during the current development phase.
