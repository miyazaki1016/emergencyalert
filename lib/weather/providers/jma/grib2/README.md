# JMA GRIB2 adapter

This directory is the production numeric-data boundary for rain intensity.

JMA's current information catalogue documents high-resolution precipitation
nowcast analysis/forecast values (5-minute precipitation intensity) as GRIB2
distributed through the Japan Meteorological Business Support Center.

Documented filename family:

`Z__C_RJTD_yyyyMMddhhmmss_NOWC_GPV_Ggis0p25km_Pri60lv_Aper5min_FH0000-0030_grib2.bin`

The format documentation states that the product contains multiple geographic
regions, with maximum 250 m resolution through 30 minutes and 1 km resolution
from 35 through 60 minutes. It also carries error/quality information; level 0
means outside observation coverage or missing.

## Guardrail

The adapter must return an explicit missing/quality state when the GRIB2 quality
information says the value is unavailable. It must never coerce that state to
0 mm/h.

No downloader credentials or distribution URL are hard-coded here. Connection
to a licensed/authorized feed is a deployment concern.

The PNG/JMA website adapter remains useful for display and diagnostics, but
numeric intensity for production decisions belongs here.
