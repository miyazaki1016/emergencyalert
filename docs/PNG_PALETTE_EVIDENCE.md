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


## Search pass: remaining colors

A targeted search for the remaining current JMA legend asset filenames did not
produce authoritative indexed results. This is not evidence that the assets do
not exist; the live nowcast application is not comprehensively indexed by web
search.

Do not fill the five missing mappings from memory or from similarly named
assets.

Next verification method:
- inspect the live nowcast application's loaded resources / source directly;
- enumerate the legend SVG assets actually referenced by the page;
- map each asset to its displayed mm/h label;
- record exact RGB values and only then promote them.

Current verified subset remains intentionally unchanged.


## Live page resource enumeration — direct result

Directly enumerating the eight image resources referenced by the current JMA
`/bosai/nowc/` page produced these resource paths:

- `images/CG.svg`
- `images/CC.svg`
- `images/ND.png`
- `images/circle_000_170_255.svg` -> #00AAFF
- `images/circle_242_242_255.svg` -> #F2F2FF
- `images/circle_250_245_000.svg` -> #FAF500
- `images/circle_255_040_000.svg` -> #FF2800
- `images/circle_255_170_000.svg` -> #FFAA00

This confirms #00AAFF as an additional current JMA-hosted RGB asset and confirms
that the earlier four filenames came from the live page itself, not a search
index.

Important: resource enumeration alone does not yet prove which precipitation
mm/h band #00AAFF or #FFAA00 represents. Do not promote either to the verified
rain-intensity palette until its semantic legend association is established.

The old 2023 table contains neither #00AAFF nor #FFAA00, strengthening the
evidence that at least part of the presentation palette changed after 2023.


## 2026-09-20 official-source recheck

A fresh search of current/recent JMA-hosted materials again confirms the
published precipitation-intensity legend boundaries used by 雨雲の動き:
1, 5, 10, 20, 30, 50 and 80 mm/h.

This strengthens the semantic intensity-band side of the model, but it does
**not** by itself prove the RGB value assigned to each band in the current
public PNG tiles.

Therefore the implementation rule remains unchanged:

- do not promote an RGB mapping merely because an old EmergencyAlert color
  occupied the same legend band;
- do not infer the meaning of current assets such as #00AAFF or #FFAA00 from
  ordering or visual similarity alone;
- keep an opaque unverified pixel as UNKNOWN_PIXEL;
- require current evidence that associates a specific RGB value with a
  specific JMA legend band before adding it to VERIFIED_JMA_PNG_PALETTE.

The remaining blocker is not the legend thresholds. It is the authoritative
RGB-to-band association for the current PNG layer.


## 2026-09-20 evidence checkpoint — promotion remains blocked

A further evidence pass checked current JMA first-party documentation and the
current indexed web surface.

Confirmed from JMA first-party material:

- high-resolution precipitation nowcast is updated every 5 minutes;
- it provides precipitation intensity out to 1 hour;
- JMA explicitly catalogs both analysis and forecast products as PNG images on
  the JMA website;
- the published intensity legend boundaries remain
  1 / 5 / 10 / 20 / 30 / 50 / 80 mm/h.

Targeted exact searches for the current live-page asset names
`circle_000_170_255.svg` (#00AAFF) and `circle_255_170_000.svg` (#FFAA00)
returned no authoritative indexed document that associates either RGB value
with a specific precipitation-intensity band.

Therefore neither color is promoted. The three existing verified mappings stay
unchanged.

This is an intentional stop, not a failed classification attempt:

> **色が見つかったことと、その色の意味が分かったことは別。**

The remaining proof requires inspecting the live nowcast application's resource
relationships (legend label -> referenced asset) or an equivalent first-party
machine-readable definition. Search-engine absence must never be replaced with
visual inference, historical ordering, or guesswork.
