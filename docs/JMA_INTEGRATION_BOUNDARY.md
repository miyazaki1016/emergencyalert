# JMA integration boundary

EmergencyAlert intentionally separates two kinds of JMA data access.

## Public web PNG

The JMA information catalogue lists high-resolution precipitation nowcast
analysis/forecast imagery as PNG on the JMA website. This is useful for the
human-facing map and for development diagnostics.

The website tile URL, JSON metadata and exact RGB palette are not treated as a
stable numeric API contract.

Therefore:

- PNG pixels may be inspected in Developer View.
- Unknown or unverified pixels remain UNKNOWN_PIXEL.
- The application must not silently translate a guessed RGB value into an
  official rainfall intensity.
- A website implementation change must fail closed, not become NO_RAIN.

## Numeric source

JMA's information catalogue separately documents high-resolution precipitation
nowcast analysis/forecast values as GRIB2 distributed via the Japan
Meteorological Business Support Center.

For production numeric rainfall classification, prefer a documented numeric
source/authorized feed rather than reverse-engineering presentation colors.

This boundary is deliberate: presentation pixels are not the source of truth
for numeric intensity.

## Phase 1 consequence

The first UI can prove:

location -> Web Mercator coordinate -> JMA frame -> JMA PNG -> exact pixel ->
Developer View

but user-facing numeric/actionable rain decisions stay disabled until a
verified numeric mapping/source is connected.

Do not weaken this guard merely to make the demo appear complete.
