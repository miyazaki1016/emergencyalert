# JMA sample validation findings

Checked against JMA public documentation in 2026-09.

## Confirmed

JMA publishes a downloadable sample for the high-resolution precipitation
nowcast on its GPV sample page. The product contains precipitation intensity and
5-minute precipitation amount forecasts. Resolution is 250 m through 30 minutes
and 1 km from 35 through 60 minutes, updated every 5 minutes.

The live numeric GRIB2 product and the public website PNG are two documented
representations of the same named high-resolution precipitation-nowcast family,
but they have different delivery paths.

The documented numeric filename family is:

Z__C_RJTD_yyyyMMddhhmmss_NOWC_GPV_Ggis0p25km_Pri60lv_Aper5min_FH0000-0030_grib2.bin

JMA's format documentation says the distributed GRIB2 is gzip-compressed.

## Important limitation

The existence of an official GRIB2 sample does NOT prove that a matching
historical website PNG for the sample's exact valid time remains publicly
available.

Therefore the sample is useful for:
- implementing and testing a GRIB2 decoder;
- understanding official grid/quality/value semantics;
- building deterministic fixtures;
- checking threshold logic.

It must NOT be used to manufacture a PNG palette unless the exact corresponding
PNG, time and geographic point can also be independently obtained and aligned.

## Zero-cost plan

1. Download and decode the official sample during development.
2. Convert selected known grid points into test fixtures.
3. Continue observing live public PNG RGBA values in Developer View.
4. Search for an authoritative palette definition or a reproducible exact-time
   PNG/GRIB2 alignment.
5. Keep user-facing numeric rain interpretation disabled until that bridge is
   verified.
6. Never copy the 2023 RGB table merely because it looks plausible.

This preserves the zero-fixed-cost constraint without weakening the evidence
standard.
