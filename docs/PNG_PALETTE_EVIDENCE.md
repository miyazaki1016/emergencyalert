# JMA public PNG palette evidence

> **Current conclusion (2026-09-23): seven PNG mappings verified; 20–30 mm/h
> unresolved.** Earlier sections below are investigation history, not current
> proof. The circle assets were AMeDAS ten-minute rainfall symbols, not the
> hrpns precipitation-intensity legend. The former #FAF500 verification is
> withdrawn. See the dated correction at the end and the archived originals.

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

## 2026-09-23 live-browser verification and correction

### Source chain (JMA only)

Opened [the current application](https://www.jma.go.jp/bosai/nowc/) in a browser.
The resulting URL selected `colordepth:normal/elements:hrpns&slmcs`.
Read its live DOM, inline initialization scripts and loaded-resource inventory.
The browser exposed the hrpns PNG requests and all three hrpns legend SVGs.
Original image assets were exported without screenshot sampling or conversion.

1. The page initializes `L.jmaTile` with `contentPropsUrl` pointing to
   [nowc.properties__7d6f7d8dc6f16a416574.xml](https://www.jma.go.jp/bosai/nowc/table/nowc.properties__7d6f7d8dc6f16a416574.xml).
2. That XML, lines 252–290, declares `element id="hrpns"`, the tooltip
   高解像度降水ナウキャスト, `legendHTML`, and `imageType id="hrpns" type="tile"`.
   Its `dataRootUrl` is `../jmatile/data/nowc` (line 15).
3. The live DOM's visible `jmatile-showhide-colorDepth-normal` contains
   [legend_jp_normal_hrpns.svg](https://www.jma.go.jp/bosai/nowc/images/legend_jp_normal_hrpns.svg).
   The thin/deep containers were hidden. The same XML explicitly associates
   all three variants with **this hrpns element**, not merely with the page.
4. The SVG contains actual `降水強度` and `mm/h` text, numeric boundary labels,
   rectangle paths, and exact `fill="rgb(...)"` values. The table below records
   each path's coordinate interval and the numeric labels on its boundaries.
   This uses the SVG's explicit legend geometry, not array/resource order,
   perceived hue, PNG palette index, or the 2023 table. Text baselines are
   16 SVG units below the corresponding boundary strokes (e.g. 20: y=352
   beside the stroke y=336; 30: y=292 beside y=276).
5. Browser requests included
   `.../20260923101500/none/20260923101500/surf/hrpns/4/13/6.png`.
   Decoded original bytes contain all seven corroborated RGBs plus #FAF500.
   Also fetched its native-zoom child
   [10/891/411.png](https://www.jma.go.jp/bosai/jmatile/data/nowc/20260923101500/none/20260923101500/surf/hrpns/10/891/411.png)
   using the same time/layer and tile geometry. This is zoom 10 as used by the
   provider; it independently contains multiple pixels of every listed RGB.

### Exact correspondence and promotion decision

All PNG counts below are decoded **opaque alpha=255** pixels from the archived
zoom-10 tile, not pixels of a composited browser screenshot. Intervals use lower
inclusive / upper exclusive boundaries.

| mm/h | SVG path y interval | hrpns SVG fill RGB (hex) | Matching PNG count | Decision |
| --- | --- | --- | ---: | --- |
| <1 | 516–576, below boundary 1 | 242,242,255 (#F2F2FF) | 5550 | VERIFIED LT_1 |
| 1–5 | 456–516, boundaries 5/1 | 160,210,255 (#A0D2FF) | 3594 | VERIFIED 1_TO_5 |
| 5–10 | 396–456, boundaries 10/5 | 33,140,255 (#218CFF) | 1037 | VERIFIED 5_TO_10 |
| 10–20 | 336–396, boundaries 20/10 | 0,65,255 (#0041FF) | 1245 | VERIFIED 10_TO_20 |
| 20–30 | 276–336, boundaries 30/20 | 255,245,0 (#FFF500) | 0 | UNKNOWN PNG mapping |
| 30–50 | 216–276, boundaries 50/30 | 255,153,0 (#FF9900) | 531 | VERIFIED 30_TO_50 |
| 50–80 | 156–216, boundaries 80/50 | 255,40,0 (#FF2800) | 331 | VERIFIED 50_TO_80 |
| >=80 | 96–156, above boundary 80 | 180,0,104 (#B40068) | 214 | VERIFIED GTE_80 |

**Yellow conflict:** PNG #FAF500 (250,245,0) occurs 562 times in that tile,
but the three current hrpns SVG variants all specify #FFF500 (255,245,0).
The SVG establishes the legend's 20–30 color; it does not establish the meaning
of the different PNG RGB. No explicit conversion or class-to-PNG-RGB definition
was established in the examined XML/JS. Do not assign #FAF500 by elimination,
palette order, apparent similarity, or historical values. Both yellow RGBs
remain unsupported by the production PNG classifier. Remove the previously
registered #FAF500 mapping rather than grandfathering unproven evidence.

### Why circle assets do not answer this question

The same nowc XML, lines 403–460, defines `amds_rain10m` (アメダス１０分間雨量).
Its `symbolStyle.iconId` function explicitly returns `circle_000_170_255` for
rain10m >=1 and <5, `circle_250_245_000` for >=5 and <10,
`circle_255_170_000` for >=10 and <15, and `circle_255_040_000` for >=15.
These are **ten-minute accumulated rainfall** symbols, not hrpns mm/h classes.
Thus #00AAFF and #FFAA00 remain UNKNOWN_PIXEL for hrpns. Their presence did not
prove that the precipitation-intensity palette changed. The earlier assertion
that #FF9900 was obsolete is superseded: current hrpns SVG and PNG both confirm it.
The earlier three-entry subset had no sufficient semantic proof from circle
filenames alone; #F2F2FF and #FF2800 are now independently reverified via hrpns.

### Opacity is presentation, not an alternative raw palette

[jmatile.properties__8f09b62937127ac173c5.xml](https://www.jma.go.jp/bosai/jmatile/table/jmatile.properties__8f09b62937127ac173c5.xml),
lines 49–51, gives thin/normal/deep opacity 50/75/100. The corresponding SVGs
have identical RGB fills and opacity .5/.75/1. The loaded
[jmatile JS bundle](https://www.jma.go.jp/bosai/jmatile/js/jmatile.bundle__6888179e2a40840a12d6.js)
selects `this._props.colorDepth[this.status.colorDepth].opacity` for
`changeColorDepth` layers. This does not turn red=250 into red=255 in PNG bytes.
Do not register screenshot/composited RGBs or partially transparent aliases.

### Reproducible evidence and remaining boundary

Original HTML/XML/SVG/PNG files, an exact JS excerpt, source URLs, SHA-256
hashes, raw RGBA counts, and up to three pixel coordinates per opaque color are
archived in [the evidence manifest](evidence/jma-palette-2026-09-23/manifest.json).
The JS manifest distinguishes the full-source hash from the saved excerpt hash.
Coordinates are zero-based. The nine browser-observed PNG tiles and one native
zoom tile are snapshots for 2026-09-23 10:15 UTC, not a promise that live URLs
will remain available. No old repository data were used to infer assignments.

Tests read the archived zoom-10 PNG and exercise all seven corroborated RGBs,
the withdrawn yellow mapping, the SVG-only yellow, AMeDAS-only colors, and
partial alpha; provider integration preserves UNKNOWN_PIXEL for unsupported
colors. Palette watcher tests still detect changes without automatic promotion.

This resolves seven of eight bands, **not production readiness**. The 20–30
PNG mapping still needs an explicit current JMA encoding definition, conversion,
or corrected first-party legend that resolves the contradiction. The separate
transparent-pixel/coverage semantics remain outside this verification: observing
transparent pixels does not itself prove NO_RAIN. Existing coverage policy was
not changed here.


## 2026-09-23 transparency/coverage investigation checkpoint

**Unresolved:** `classifyRainPixel` currently treats any `alpha=0` pixel as
`NO_RAIN`. The 2026-09-23 RGB verification explicitly did **not** validate
this rule. A transparent PNG pixel proves only that the hrpns overlay painted
nothing at that coordinate, not that the coordinate was inside a valid
precipitation-forecast coverage area.

JMA's [HRPN product description](https://www.jma.go.jp/jma/en/Activities/highres_nowcast.html)
explicitly distinguishes forecast regions from areas where no forecasts are
provided, with resolution and lead-time-dependent coverage. Its published
[GRIB2 product specification](https://www.data.jma.go.jp/suishin/shiyou/pdf/no11802)
likewise describes target areas. Neither source establishes an alpha-channel
meaning for public hrpns PNG tiles. Do not promote the existing transparent
pixel assumption into a verified coverage claim on this evidence alone.

**Next proof requirement:** establish the actual public PNG transparency and
coverage semantics from a first-party encoding definition or a reproducible
comparison against authoritative coverage/data at the same target time,
lead time and coordinate. Specifically test transparent pixels both inside
and outside the documented coverage, including the 35–60 minute range.
If this cannot be established, fail closed for transparent pixels until an
independent, validated coverage check is available. Do not equate a successful
tile HTTP response with valid meteorological coverage.

> 透明は「描かれていない」の証拠。「雨がない」の証拠とは限らない。


## 2026-09-23 first real-device transparency observation

The first iPhone production test successfully exercised the complete public path:
geolocation -> JMA metadata/tile fetch -> provider -> interpretation -> UI.
The device reported approximately ±8 m location accuracy; the UI showed a JMA
source valid time one minute behind the server check time. The returned current
and forecast frames were present, but their sampled pixels were transparent and
therefore classified as `UNKNOWN_PIXEL` under the fail-closed rule.

This is useful operational evidence that the safety boundary is active in the
real deployment. It is **not** evidence that transparent means dry. The next
investigation must compare the same coordinate/time against authoritative JMA
coverage semantics (including forecast lead time) before any transparent pixel
can be promoted to `NO_RAIN`.

> 実機で止まったことは確認できた。止めなくてよい根拠は、まだない。
