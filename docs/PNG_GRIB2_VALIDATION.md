# PNG and GRIB2 validation protocol

## Goal
Use an official JMA high-resolution precipitation nowcast GRIB2 sample as an independent numeric reference while validating the public PNG representation. A sample file is for development and verification, not live production data.

## Procedure
1. Obtain an official JMA high-resolution precipitation nowcast GRIB2 sample.
2. Record its exact base time, valid time and product metadata.
3. Decode a grid point whose numeric precipitation intensity is known.
4. Locate the same geographic point and valid time in the corresponding JMA PNG product when available.
5. Record the exact RGBA pixel.
6. Compare multiple points for the same intensity class, including class boundaries where possible.
7. Add a PNG mapping only after repeatable agreement and preserve the evidence.
8. Any color not verified remains UNKNOWN_PIXEL.

## Acceptance rule
A single matching pixel is not sufficient. Time and geographic alignment must be verified, multiple independent pixels must agree, documented JMA intensity thresholds must remain consistent, and missing-data pixels must remain distinguishable.

## Failure rule
If a sample's corresponding PNG cannot be obtained, do not infer a palette from the sample alone. Keep the mapping unverified.

## Non-negotiable
UNKNOWN_PIXEL is not NO_RAIN.

The objective is not to make the demo produce an answer quickly. The objective is to know why it produced that answer.
