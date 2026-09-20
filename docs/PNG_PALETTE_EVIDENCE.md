# JMA public PNG palette evidence

## 2026-09 finding

The current JMA "雨雲の動き" product visibly publishes a precipitation-intensity
legend with boundaries:

1 / 5 / 10 / 20 / 30 / 50 / 80 mm/h.

JMA's developer guide confirms that high-resolution precipitation nowcast is
displayed on that page and that its imagery can be obtained from the JMA
website.

This exactly matches the intensity boundaries recovered from the 2023
EmergencyAlert implementation:

<1, 1-5, 5-10, 10-20, 20-30, 30-50, 50-80, >=80 mm/h.

## Historical RGB values recovered from old EmergencyAlert

These values are evidence from the old implementation, not yet promoted to the
2026 verified palette:

- #f2f2ff -> <1
- #a0d2ff -> 1-5
- #218cff -> 5-10
- #0041ff -> 10-20
- #faf500 -> 20-30
- #ff9900 -> 30-50
- #ff2800 -> 50-80
- #b40068 -> >=80

The user's recollection is that these RGB values were sampled from the JMA
on-screen legend with a color-inspection tool. The current screenshot of the
JMA page is consistent with that workflow and with the same eight intensity
bands.

## Evidence status

This substantially strengthens the provenance of the 2023 table: it was likely
derived from JMA's own legend rather than guessed from arbitrary map pixels.

It still does not prove that every 2026 public tile uses byte-for-byte identical
RGB values. Before enabling production classification:

1. inspect the current legend asset/style or current tile pixels;
2. measure the eight current RGB values without screenshot compression;
3. compare them byte-for-byte with the historical table;
4. verify several live tile pixels for each obtainable class;
5. only then move matching values into VERIFIED_JMA_PNG_PALETTE.

Do not sample RGB from a JPEG/screenshot for final verification because image
compression/color handling can alter exact byte values.

## Threshold conclusion

The precipitation-intensity class boundaries themselves are now supported by
both current JMA documentation/display and the historical implementation.
The remaining verification target is the exact current PNG RGB encoding.


## Direct evidence from the current JMA page

Inspection of the current JMA `/bosai/nowc/` page exposed legend image asset
filenames that encode RGB values directly. Confirmed current assets include:

- `circle_242_242_255.svg` -> #F2F2FF
- `circle_250_245_000.svg` -> #FAF500
- `circle_255_040_000.svg` -> #FF2800
- `circle_255_170_000.svg` -> #FFAA00

This is stronger evidence than sampling a screenshot: these are current
JMA-hosted asset names from the live nowcast page.

Three of those values exactly match the recovered 2023 table (#F2F2FF,
#FAF500, #FF2800). One current asset, #FFAA00, does NOT equal the old #FF9900.
Therefore the historical table must not be copied wholesale.

The remaining legend classes still need direct asset/pixel confirmation and
semantic association with the mm/h bands before the 2026 verified palette is
enabled.
