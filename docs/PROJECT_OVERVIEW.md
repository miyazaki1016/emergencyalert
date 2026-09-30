# EmergencyAlert 2026 — Project Overview

This document exists because neither future Sei-chan nor future Sora should be
trusted to remember why the system was built. :)

## Origin

The original idea was ordinary and personal:

> おかあさん、そろそろ雨降ってくるよ。洗濯物しまったほうがいいよ。

The heat/WBGT feature came from the same place: give useful information early
enough that a parent can tell a child before school:

> 今日は昼から暑くなるんだってさ、気をつけなー。

EmergencyAlert is therefore not primarily a weather-information broadcaster.
Its job is to make a small piece of the near future useful early enough for
someone to act or say something to a person they care about.

## Constitution

暮らしを、少し先回りする。  
必要な人に、必要な情報を、必要な時に。  
必要でなければ、静かに見守る。

Functional tagline:

> あなたの場所の、これからを見張る。

## Meteorological boundary

EmergencyAlert does not independently forecast weather.

Official/authorized forecasts, observations and disaster information are the
source of truth. EmergencyAlert connects that information to a person's place,
time and life, decides whether it is relevant enough to surface, and explains
it clearly.

AI must not invent, interpolate or improve meteorological phenomena, timing,
rainfall values or danger levels.

## Missing-data rule

UNKNOWN_PIXEL != NO_RAIN.  
FETCH_ERROR != NO_RAIN.  
NO_DATA != SAFE.

Never turn "we do not know" into "you are safe."

## 2023 archaeology

The old application used the JMA high-resolution precipitation nowcast at the
user's geographic point. It converted latitude/longitude to a map tile and
pixel, read that pixel and mapped the JMA legend colors to precipitation
intensity bands.

Recovered historical bands:

- #F2F2FF -> <1 mm/h
- #A0D2FF -> 1-5
- #218CFF -> 5-10
- #0041FF -> 10-20
- #FAF500 -> 20-30
- #FF9900 -> 30-50
- #FF2800 -> 50-80
- #B40068 -> >=80

The user's recollection is that the colors were measured from JMA's on-screen
legend with a color inspection tool. Current investigation has found direct
JMA page assets whose RGB values corroborate several historical values. At
least one current asset differs from the old table, so 2026 must re-verify the
complete current palette before enabling it.

Rule:

> 思想は継承する。実装は検証する。

## 2026 rain product

First product: 「アメくる？2026」

Initial chain:

current location
-> public JMA high-resolution nowcast data
-> tile/pixel
-> verified interpretation
-> useful life-language message
-> later: watch place / Push

Lifestyle notification threshold under consideration:

- <1 mm/h: no Push
- 1-5 mm/h: generally no Push
- >=5 mm/h within about 30 minutes: notification candidate
- stronger rain: stronger wording

This is a product-action threshold, not a meteorological danger threshold.

For rain ending, do not infer "やみそう" from one dry frame. Current design
requires three consecutive valid NO_RAIN frames (15 minutes) with no unknown
gap before an ending claim.

## Cost constraint

Current development assumes zero fixed weather-data subscription cost.

The paid JMBSC GRIB2 feed is a future provider option only. Do not make it a
Phase 1 dependency. Reconsider it when the project has sufficient revenue or
funding.

## Current implementation / checkpoint (2026-09-20)

「アメくる？2026」の Phase 1 本線は、現在地から気象庁データを取り、
安全に解釈して簡潔な生活言葉で表示するところまで接続済み。

Implemented:

- Next.js + TypeScript scaffold
- browser geolocation -> server API -> JMA public-image provider
- Web Mercator tile/pixel path and tests
- RainInterpretationEngine states:
  `INSUFFICIENT_DATA / DRY / RAIN_AHEAD / ACTIONABLE_RAIN / RAINING / EASING / ENDING`
- claim-specific publication gate: unknown data after a supported near-term claim
  does not erase that claim, while unknown data required for the claim blocks it
- semantic event v1 separated from presentation
- casual 「アメくる？」 message formatter and visible UI
- checked-at time, location accuracy and JMA source display
- explicit uncertainty card when a claim is withheld
- stale UI results are cleared before re-check/location failure
- provider integration tests and end-to-end interpretation -> publication ->
  semantic event -> message pipeline tests
- daily fail-safe palette watcher scaffold; it detects change but never promotes
  a new RGB mapping automatically

### Rain interpretation safety now locked by tests

The engine currently fails closed for:

- malformed JMA `baseTime` / `validTime`
- stale observation (>15 minutes old)
- implausibly future observation (>5 minutes ahead)
- a forecast series whose targets are all already in the past
- empty forecast coverage (zero frames can never become DRY)
- incomplete/unknown evidence needed for a user-facing claim
- easing claims that would have to skip an unknown frame
- impossible forecast metadata where `baseTime > validTime`

The 15-minute observation tolerance is an operational freshness guard, not a
meteorological threshold.

Do not copy the forecast `baseTime <= validTime` rule onto observation frames
without provider-specific evidence. Observation and forecast metadata are
different products even when field names look similar.

> 同じ名前の項目でも、同じ意味とは決めつけない。

### Current user-facing behavior

The main UI intentionally stays simple:

- 「この先、雨なし」
- 「このあと雨くるよ」
- 「もうすぐ雨くるよ」
- 「いま雨だよ」
- 「弱くなりそう」
- 「もうすぐやみそう」

When the evidence is insufficient it instead says, in effect:

> いまは、はっきり言えないよ。雨が降らないって意味じゃないよ。

The implementation underneath may be strict; the surface should remain
glanceable and everyday.

### Current blocker

**2026-09-23 correction:** Direct browser DOM/resource inspection now links
the hrpns layer to its own precipitation legend. Seven RGB mappings are verified
against original current PNGs (including zoom 10). The remaining 20–30 mm/h
legend uses #FFF500, while PNGs contain #FAF500; the former #FAF500 registration
has been withdrawn and both yellows remain UNKNOWN_PIXEL. #00AAFF/#FFAA00
circle assets belong to AMeDAS ten-minute rainfall, not hrpns intensity.
#FF9900 is confirmed by current hrpns evidence. See
[PNG_PALETTE_EVIDENCE.md](PNG_PALETTE_EVIDENCE.md) for the source chain, originals,
hashes, exact band table and unresolved conflict. The older archaeology and
checkpoint notes must not override this correction.

The largest remaining production blocker is the current JMA PNG precipitation
palette. The current 2026 page has verified mappings for only part of the
legend. Unknown opaque RGB values remain `UNKNOWN_PIXEL`; old 2023 mappings
must not be resurrected by guesswork.

The palette watcher is intentionally fail-safe:

> 変更は自動で見つける。意味は勝手に決めない。

It is scaffolding only; finishing the main 「アメくる？」 flow takes priority
over building a clever automatic palette-promotion system.

## Immediate work from this checkpoint

1. Keep the Phase 1 rain path stable and CI-green.
2. Tighten any remaining user-facing wording that can sound more absolute than
   the official evidence (for example, prefer “雨の予報なし” over an absolute
   “雨なし” where appropriate).
3. Expose source-valid time separately from app check time when useful, so a
   fresh UI check cannot hide old source data.
4. Finish evidence-backed verification of the remaining current JMA PNG legend
   RGB mappings; never guess them.
5. Re-check the transparent-pixel => NO_RAIN assumption against current evidence
   before calling the public-image path production-ready.
6. Once the verified rain path is solid, add watch-place/change detection and
   only then Push behavior.

## Must not break

- Do not independently forecast weather.
- Do not silently convert unknown/missing data to dry.
- Do not resurrect old RGB values without current verification.
- Do not add paid weather-data subscriptions during the current phase.
- Do not make the internals complicated for the user just because they are
  complicated underneath.

## Recovery phrases

If the project becomes abstract or bloated:

> ソラ、洗濯物どこいった？

And the engineering rule:

> 未来のソラを信用するなｗ

That is why this file exists.


## 2023 design intent recovered from operation history

The animated rain-cloud GIF was not decoration. Its purpose was to make the
coming change visually understandable: not merely “heavy rain will arrive
around XX:XX”, but “this rain area is moving toward you like this, so act now.”

The 2023 implementation automated a browser, captured successive JMA nowcast
frames, assembled them into an animated GIF, and posted it to Twitter/X.
Twitter could transcode the uploaded animated GIF to MP4 for timeline delivery;
that does not mean EmergencyAlert itself generated MP4.

This is an important product principle for 2026:

> 情報を増やすのではなく、行動につながる実感を増やす。

When useful, EmergencyAlert should help the user understand the time progression
of an officially published phenomenon, while never creating or extrapolating
meteorological movement on its own.


## Output boundary — facts first, expression later

EmergencyAlert's reusable output must stop at structured facts and
interpretation. Product-specific wording is a separate presentation layer.

Canonical flow:

> Official source → EmergencyAlert interpretation → structured event → presentation/personality layer

The structured event should carry the facts needed by downstream consumers,
for example state, relevant times, intensity class, source, checked-at time,
location and location accuracy, plus data/interpretation status.

EmergencyAlert may provide its own simple everyday-language presentation, but
that wording is not the canonical output and must not be required by downstream
integrations.

For Misaki or any future consumer:

- the consumer may change tone, phrasing and personality;
- it may use its own relationship/context rules to decide how to say the fact;
- it must not change the underlying meteorological interpretation;
- it must not invent rain, timing, intensity or danger that EmergencyAlert did
  not establish from the official source.

In short:

> EmergencyAlert = 目。各サービス = 伝え方。

This boundary is a project-wide overview item because it keeps the weather
truth reusable while allowing Misaki, Push, LINE, voice or future products to
express the same event in their own way.


### Consumer simplicity is part of the EmergencyAlert contract

Separation must not mean pushing meteorological complexity into each consumer.
EmergencyAlert is responsible for turning its interpretation into a
consumer-ready semantic event.

A downstream service should not need to understand JMA tile colors, rainfall
thresholds, consecutive-frame rules, missing-data handling, or the logic that
decides whether an event is actionable.

A semantic event may therefore include fields such as:

- event type (for example, rain approaching / raining / easing / ending);
- urgency class;
- relevant timing;
- normalized intensity;
- suggested action (for example, bring laundry inside);
- source, checked-at time and data status.

The exact schema will evolve, but the responsibility boundary is fixed:

> 判断はEmergencyAlertに寄せる。表現は利用側に渡す。
> ただし、利用側に気象ロジックを再実装させない。

Misaki and other consumers should mainly decide how to express an already
grounded event in their own voice and context. They must not be forced to
reconstruct EmergencyAlert's weather logic in order to use it.

Future integration APIs/SDKs should optimize for this goal: receiving and using
an EmergencyAlert event should be simple even when the implementation behind
that event is complex.


### Keep each consumer's experience distinct

Sharing the same EmergencyAlert event must not make every consumer feel like the
same notification UI.

**アメくる？** is a glanceable utility. Its job is to answer the immediate
question with the shortest useful wording. Do not turn it into a conversational
character merely because the event layer can support richer expression.

**Misaki** is a conversational relationship experience. EmergencyAlert events
should enter naturally through conversation and context, as something Misaki
noticed and cared to mention. Do not turn Misaki into a weather notification
bot or simply paste アメくる？ copy into chat.

Therefore:

> アメくる？は簡潔に。美咲は会話の中に。

The shared event carries the grounded fact and actionable meaning; each
consumer owns its experience. Reuse the truth, not the presentation.


### Current trust metadata checkpoint (2026-09-23)

The rain API now keeps the time EmergencyAlert checked the data separate from
the valid time of the JMA observation used for the claim:

- `checkedAt`: when EmergencyAlert performed the interpretation;
- `sourceValidAt`: the observation `validTime` supplied by the JMA source.

The user-facing アメくる？ card may show both values, but must not turn a
malformed source timestamp into a plausible-looking time. If the source time
cannot be validated, omit that detail rather than guessing.

Likewise, a DRY result is presented as **「雨の予報なし」**, not the stronger
**「雨なし」**. EmergencyAlert reports what the official data supports; it does
not convert a forecast into certainty.

> 確認した時刻と、元データの時刻は別物。
> 予報がないことと、絶対に降らないことも別物。


### Transparent hrpns pixels fail closed until coverage semantics are proven

As of 2026-09-23, a fully transparent public hrpns PNG pixel is **not** treated
as `NO_RAIN`. It is classified as `UNKNOWN_PIXEL` because transparency proves
only that the overlay did not paint precipitation at that pixel; it does not by
itself prove that the coordinate/time was inside valid meteorological coverage.

This intentionally reduces useful DRY claims while the evidence gap remains.
The restriction may be relaxed only after first-party encoding evidence or a
reproducible authoritative coverage comparison establishes the public PNG
alpha/coverage semantics.

> 分からないものを「雨なし」にしない。


## First production-device milestone and next product phase (2026-09-23)

The first iPhone production test completed the real path from browser geolocation
to JMA retrieval, conservative interpretation and user-facing display. The test
also confirmed that withheld interpretation is presented separately from a data
fetch failure, with checked time, location accuracy and JMA source time visible.

This closes the initial "can the real phone ask about this place now?" milestone.
Do not keep polishing the one-shot screen as a substitute for the product's
actual purpose.

The next product phase is **watching a place over time and noticing a meaningful
change**. Design it around the existing semantic event boundary:

- a watch target is a location the user has intentionally chosen;
- repeated checks must preserve uncertainty rather than treating UNKNOWN as dry;
- notification eligibility comes from a grounded semantic transition/event, not
  from raw PNG color changes;
- deduplicate the same episode so a 5-minute source cadence does not become
  repeated nagging;
- lifestyle notifications remain quiet when there is nothing useful to say;
- Push is a delivery layer after change detection, not the weather decision
  engine itself.

Phase order: **watch target -> repeated evaluation -> semantic change detection
-> deduplication/cooldown -> Push delivery**. Persistence and scheduling should
be added only as required by that path; do not introduce accounts or a large DB
before the first watch flow needs them.

> 見張るのは天気ではなく、「今ならひと言かける意味がある変化」。


## Handoff checkpoint — 2026-09-24

This section is the current operational handoff. Read it before continuing work.

### Production / verified on real devices

- Production: `emergencyalert-gilt.vercel.app`.
- PWA foundation is deployed: manifest, service worker registration and EmergencyAlert icon.
- Android real-device test confirmed EmergencyAlert can be installed to the home screen as a Chrome-origin PWA.
- iPhone real-device weather flow is working.
- Watch-place persistence works through Supabase anonymous auth + RLS.
- A saved watch target remains until the user deletes it.
- Each target has independent `enabled` state: OFF pauses monitoring without deleting the registration.
- Delete action is deployed and was verified end-to-end on iPhone: confirmation -> DB deletion -> card disappears.
- GPS/current-location registration works.
- Facility/station search through Nominatim works.
- Japanese street-number address search now uses `@geolonia/normalize-japanese-addresses`; `江東区塩浜2-9-8` was resolved and registered successfully on a real device.
- Important bug already fixed: the address detector was accidentally `/\\\\d/` instead of `/\\d/`.
- Public Nominatim is now used as a single explicit request for facility/station search; do not restore rapid retry loops.
- The 5-minute server watcher is proven to fire automatically. `watch-rain-every-5-minutes` showed repeated successful cron runs and `watch_states.last_checked_at` updates.
- UNKNOWN remains UNKNOWN; it is not converted to dry/no-rain.

### Push — current starting point

Push delivery is the current main line of work.

A Supabase table `public.push_subscriptions` has already been created with:
- `owner_id`, `endpoint`, `p256dh`, `auth`, optional `user_agent`;
- unique `(owner_id, endpoint)`;
- RLS enabled;
- authenticated users can select/insert/update/delete only their own subscriptions.

The PWA does **not** yet have the complete notification-permission/subscription UI and the server watcher does **not** yet send Web Push. Continue from here.

Required flow:
site/PWA -> user explicitly enables notifications -> browser Push subscription -> save subscription -> watcher finds grounded actionable semantic change -> send Push -> only after successful delivery record notification delivery state.

Do not set `last_notified_at` merely because a notification *would* be eligible. The existing watch worker previously had simplified eligibility bookkeeping; before real Push is enabled, make `last_notified_at` mean successful delivery.

iPhone Web Push should be tested from the home-screen installed PWA. Android PWA installation has already been verified on a real device.

### Watch-target UI decision waiting for implementation

The owner requested a clearer ON/OFF control:
- `見張る：ON` should have a **light yellow-green / lime** active appearance.
- OFF should be visually subdued/neutral so state is obvious at a glance.
- Keep the control simple; color is a state cue, not decoration.
- Delete remains a separate destructive action.

This UI tweak is approved direction but was **not implemented yet** at this checkpoint.

### Current DB / worker model

`watch_targets` is the canonical saved-place table. Important fields include:
`owner_id`, label, latitude/longitude, display address/name, source, `enabled`, and `notifications_enabled`.

`watch_states` stores per-target monitoring state and is deleted with its target through the FK cascade.

The Supabase Edge Function `watch-rain` is invoked by cron every five minutes using the configured secret header. It evaluates enabled targets against the production rain API. Push sending still needs to be added.

### Product/engineering invariants for the next Sora

- EmergencyAlert does not predict weather independently.
- Official/authorized source -> interpretation -> semantic event -> presentation/delivery.
- Do not turn missing/unknown data into safety.
- Watch saved places, not device movement.
- Notify only meaningful grounded change; avoid 5-minute nagging.
- UI stays simpler as internals become more complex.
- Misaki may later consume EmergencyAlert facts, but EmergencyAlert and Misaki remain separate products and presentation layers.
- Verify actual files/results after writes. A successful commit message is not proof that the intended code is present.
- CI must pass before merge; verify Production deployment afterward.
- Do not expose or repeat secrets. The watch cron token was previously visible during setup and should eventually be rotated.

### Current implementation status and immediate next work (updated 2026-09-25)

The operational handoff above was written before several items were merged. The
repository on `main` is now ahead of that handoff in these areas:

- the saved watch-target ON/OFF control is implemented and deployed:
  `見張る：ON` uses the approved light yellow-green/lime active state and OFF
  is neutral/subdued;
- explicit Web Push permission/subscription UI is implemented in the PWA;
- Push subscriptions are persisted to `public.push_subscriptions`;
- the service worker already contains Push reception/notification handling;
- VAPID-key changes are handled by replacing an incompatible existing browser
  subscription;
- temporary one-shot Push test UI used during verification was removed after
  testing;
- saved-place registration now clears the place-search UI after a successful
  registration.

Therefore, do **not** restart work from the old items 1–3. The next main product
work is the server-delivery side:

1. inspect the current `watch-rain` worker and existing notification decision
   code before changing it;
2. add/finish server-side Web Push delivery from the watcher only for grounded,
   actionable semantic changes;
3. make `last_notified_at` mean **successful Push delivery only** — eligibility,
   an attempted send, or a failed send must not advance it;
4. preserve UNKNOWN/fetch-error behavior and the existing meteorological
   interpretation boundary while adding delivery;
5. test Push end-to-end on the installed Android PWA, then on the iPhone
   home-screen PWA;
6. add/verify episode dedupe and cooldown so the five-minute watcher does not
   repeatedly notify the same rain episode.

Keep the JMA `rasrf` member-path correction isolated from Push work. PR #26 is
the scoped correction for carrying `targetTimes.json` frame `member` into the
tile URL; it still requires its own CI/evidence/merge verification and must not
be mixed into watcher/Push changes.

> 第3条：ソラの「入れた」は、実物を見るまで信用するな。


## JMA rasrf target member checkpoint — 2026-09-25

The precipitation short-range forecast path has an additional source-contract
requirement that must be preserved before continuing Push work.

`rasrf/targetTimes.json` supplies a `member` for each forecast frame. The
early-forecast tile URL builder must treat that value as part of the frame
metadata and use it for the member path segment. Do not hard-code `none` in
the URL builder.

Canonical frame-to-tile relationship:

> target frame `basetime` + `member` + `validtime` -> rasrf tile URL

Implementation rule:

- `buildJmaEarlyForecastTileUrl` receives `basetime`, `validtime`, and
  `member`;
- the URL member segment comes from `frame.member`;
- tests must cover at least `immed` and `none`;
- a tile fetch failure remains `FETCH_ERROR`; it must never become NO_RAIN;
- this correction does not change Push, Supabase, watch-target persistence, or
  the meteorological interpretation boundary.

PR #26 is the isolated implementation of this correction. Keep it separate
from Push work, require CI to pass before merge, and verify the resulting
Production deployment afterward.

> targetTimes の値を読んでいるだけでは足りない。URLまで同じフレーム情報を運ぶ。


## Nationwide heavy-rain refinement checkpoint — 2026-09-30

PR #59 (`feat/national-heavy-rain-preview`) establishes the proof architecture
for nationwide strong-rain discovery and municipality refinement. It remains
proof-only: do not connect it to production Push or `watch_targets`, and do not
apply its proof migration to Production until the worker/data path is reviewed.

### Locked semantics

- nationwide candidates use official JMA tiles;
- only >=30 mm/h classes are refined: HEAVY / VERY_HEAVY / TORRENTIAL;
- forecast strong rain is excluded when the corresponding current observation
  is already >=30 mm/h;
- the rain footprint preserves the exact union boundary of occupied raster cells
  rather than replacing it with one outer rectangle/polygon;
- municipality results are determined by exact intersection with detailed N03
  geometry after a coarse prefecture-bbox preselection;
- N03 output order is preserved; optimization must not silently reorder results.

### Performance findings

The exact administrative-area intersection itself is no longer the main
bottleneck. A fixed benchmark improved from about 21.8 ms median to about
2.8 ms median (~7.8x) after bbox/prepared-geometry pruning.

Real N03 phase measurements showed that repeated archive download, unzip and
conversion dominate the cold path. Parallel prefecture downloads reduced a
comparable four-prefecture download phase from about 12.30 s to 5.11 s.
With ZIP and prepared-area caches warm, a three-prefecture proof reached roughly
0.64 s total for prepared-data read plus exact intersection (about 0.56 s read,
0.08 s intersection).

Production rule:

> N03 is static reference data. Do not download and unzip MLIT archives every
> five-minute worker run.

The production path should use preprocessed compact per-prefecture data (and
process-memory caching where appropriate), while retaining the same exact
municipality-intersection semantics.

### Queue / worker proof

The proof queue is separate from per-user monitoring. It uses service-role-only
claim/finish RPCs, `FOR UPDATE SKIP LOCKED`, stale-processing recovery, bounded
attempts and retry delay.

A protected POST endpoint now exists at
`/api/rain/national-worker`. It requires the dedicated
`NATIONAL_RAIN_WORKER_SECRET`, bounds the requested job limit, and remains
explicitly disconnected from alert publication and Push.

The worker path is now:

> JMA high-resolution tile -> strong pixels -> exact footprint ->
> municipality resolver -> proof result persistence

The municipality resolver is reusable and dependency-injected: it first selects
candidate prefectures from `N03_PREFECTURE_INDEX_2026`, then asks an injected
loader for detailed administrative areas, then performs exact municipality
intersection. Empty footprints or no-prefecture matches do not load N03 detail.

The proof result schema now reserves both:

- `footprint jsonb`
- `municipalities jsonb`

The worker persists resolved municipalities into the same proof result row.
This schema change is still proof-only and has not been applied to Production.

### Verification checkpoint

At commit `6265d3c11c37439ed24e5d7966261833ba3a4d46`, all three relevant
workflows completed successfully:

- CI — SUCCESS, including tests, nationwide rain budget proof, fixed N03
  benchmark, live N03 phases, queue lifecycle and production build;
- National rain proof — SUCCESS;
- N03 national prefecture index proof — SUCCESS.

Do not treat this as authorization to merge or deploy PR #59. The next
engineering step is to provide the worker with production-safe prepared N03
data without per-run MLIT ZIP download, then re-run the same proof/CI gates
before any production integration.

> 全国を見る処理と、ユーザーへ知らせる処理はまだつながない。
> まず「どこで強い雨になるか」を速く正確に確定する。


### Prepared N03 Storage checkpoint — 2026-09-30

The production-safe N03 reference-data path is now defined without connecting
the nationwide proof to Push or `watch_targets`.

Measured prepared-data size for five representative prefectures was about
72.2 MiB total (Tokyo ~13.3 MiB, Kanagawa ~5.3 MiB, Shizuoka ~14.0 MiB,
Kagoshima ~21.9 MiB, Okinawa ~17.7 MiB). Therefore, do not bundle all 47
detailed N03 files into the Vercel/app bundle. Store prepared geometry as
private, per-prefecture objects and load only coarse-selected prefectures.

Production Supabase now has a private bucket named `national-rain-n03` with a
50 MiB per-object limit and JSON-only MIME restriction. The limit was raised
from 25 MiB after the full nationwide run proved that Hokkaido alone exceeds
25 MiB. The full prepared dataset is about 461,844,361 bytes (~440 MiB), and
all 47 per-prefecture objects were uploaded successfully under the immutable
20260101 prefix.

Storage object identity is locked to the exact source dataset date:

> `national-rain-n03/20260101/<prefecture>.areas.json`

Do not collapse this back to a year-only prefix. The generator, loader, guarded
uploader, tests and manual workflow share `N03_DATASET_DATE` as the dataset
identity.

The prepared-data generator is reproducible from the official MLIT N03 archives.
Its manifest records dataset identity, prefecture, area count, byte size and
SHA-256 for every generated object. The guarded uploader refuses partial
uploads, requires exactly 47 prefectures, checks filenames and byte sizes,
recomputes SHA-256 before every upload, requires the explicit
`UPLOAD_N03_PREPARED_DATA` confirmation, and uses `upsert: false` so an
existing object is not silently overwritten.

The runtime Storage loader is server-side, downloads only selected prefectures,
supports a reusable process-memory cache, preserves requested prefecture order,
and fails closed for missing files, invalid JSON, invalid administrative-area
shape, or prefecture mismatch.

A minimal manual GitHub Actions launcher now exists on `main` and checks out
`feat/national-heavy-rain-preview` for the actual N03 tooling; this avoided
merging PR #59 application code merely to make workflow_dispatch available.
The Production GitHub Environment now supplies SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY without exposing either value in chat.

The nationwide generation was exercised for all 47 prefectures. A transient
MLIT HTTP 502 was observed in real execution, so the generator now retries
retryable HTTP/network failures with bounded exponential backoff; a subsequent
run demonstrated that recovery path in practice.

The uploader has also been made safely resumable: if an immutable object already
exists, it is downloaded and accepted only when both byte size and SHA-256 match
the newly generated manifest. A mismatch fails closed; existing objects are not
silently overwritten.

The protected proof worker now uses the private prepared-N03 Storage loader and
the reusable municipality resolver. Missing/malformed prepared data still fails
the proof job closed. This remains proof-only and is still disconnected from
Push and watch_targets.

The first post-upload verification attempt exposed a script-only import bug
(resolve imported from node:fs instead of node:path); that bug was fixed.
Manual workflow run #7 was then verified from the GitHub Actions UI as fully
successful in 5m09s: all 47 prepared files generated, all 47 Storage objects
accepted/uploaded, and the final `Verify all 47 uploaded N03 objects` step
completed successfully in 25s. This closes the immutable Storage integrity
gate: all 47 objects were re-downloaded and matched the generated manifest's
byte sizes and SHA-256 hashes.

At commit `75006bb5ef8056d3d5f491e4d231d0710473b0a7`, CI and National rain
proof are successful; the N03 national prefecture index proof was still running
at the time this checkpoint was written.

Still forbidden at this checkpoint:

- do not merge/deploy PR #59 merely because proof CI is green;
- do not apply the nationwide proof migration to Production;
- do not connect nationwide results to Push or `watch_targets`;
- do not expose or paste a Supabase service-role key into chat.

The complete proof worker/data path has now been reviewed end-to-end:

> protected worker POST -> service-role Supabase client -> private prepared N03
> Storage -> coarse prefecture selection -> exact municipality intersection ->
> proof-result municipalities persistence -> queue completion

The route creates the prepared-N03 Storage loader from the same server-side
service-role client and injects the municipality resolver into the worker.
Storage download/JSON/shape/prefecture mismatches throw instead of becoming an
empty successful municipality result. The worker persists municipalities before
marking a job DONE. A dedicated worker test now locks the fail-closed behavior:
if municipality resolution fails, no proof result is saved and the job is
returned to queue completion logic as failed rather than successful.

At commit `51e2a4aaee982267b1ff86951ef9242aadc4fe15`, the post-review gates are
all green:

- CI #464 — SUCCESS;
- National rain proof #168 — SUCCESS;
- N03 national prefecture index proof #88 — SUCCESS.

The manual Production-environment data workflow also remains independently
verified: run #7 completed successfully, including re-download and SHA-256/byte
verification of all 47 immutable N03 objects.

No Push publisher or `watch_targets` mutation exists in this reviewed worker
path. The nationwide proof migration remains unapplied to Production. The
minimal workflow launcher on `main` is only the manual N03 data-upload
launcher; PR #59 application code has not been merged merely to enable it.

Next engineering gate: decide and prove how the nationwide refinement queue is
to be scheduled/invoked while keeping it isolated from user alert delivery.
Do not apply the proof migration, connect Push/watch_targets, or merge PR #59
until that next architecture gate is explicitly reviewed.

> 未来のソラを信用するな。データセット日付とハッシュまで残して、実物で確認する。


### Protected nationwide scan -> queue checkpoint — 2026-09-30

The next architecture gate is now proven without coupling nationwide work to the
existing per-user watcher.

Do **not** put nationwide scanning inside `supabase/functions/watch-rain`.
That function is the saved-target state/Push delivery path: it reads enabled
`watch_targets`, evaluates each target, sends Web Push, and updates
`watch_states`. Nationwide discovery is shared computation whose cost must not
scale with user count.

The proof flow is therefore kept separate:

> protected nationwide scan -> refinement queue -> protected worker ->
> high-resolution JMA tile -> exact rain footprint -> prepared N03 prefecture
> data -> exact municipality intersection -> proof-result persistence

A protected POST proof endpoint now exists at `/api/rain/national-queue`.
It requires `NATIONAL_RAIN_WORKER_SECRET`, uses service-role Supabase only on
the server, and does not publish alerts or mutate `watch_targets`.

The scan keeps the locked rain semantics: current >=30 mm/h pixels suppress the
corresponding forecast candidates. Coarse zoom-4 candidate pixels are mapped to
their exact zoom-8 refinement tile; only refinement tiles containing new strong
rain candidates are requested, rather than blindly queueing every zoom-8 tile
covering Japan. Multiple coarse candidates mapping to the same refinement tile
are deduplicated before enqueue.

Queue identity remains
`run_key + validtime + zoom + tile_x + tile_y`, and database upsert uses that
unique identity with duplicate-ignore semantics. Re-running the same forecast
therefore does not create duplicate jobs. The proof response deliberately calls
its metric `requestedRefinementTiles`: it is the number of tiles requested for
enqueue, not a claim that every request inserted a new database row.

Unlike the public/read-only preview's tolerant display behavior, the queue scan
fails closed. If any required coarse JMA tile cannot be fetched, the protected
route returns 503 and does not enqueue an incomplete nationwide frame. A zero
candidate frame is valid and safely produces zero jobs.

Tests lock:

- unauthenticated requests are rejected before scan/queue work;
- current strong-rain pixels are excluded from forecast refinement;
- multiple candidates mapping to one zoom-8 tile become one queue job;
- any required coarse JMA fetch failure returns 503 with no enqueue;
- zoom-4 candidate coordinates map deterministically to the matching zoom-8
  refinement tile.

At commit `8fe751b3d9a37b01bd7fe3b408469773af13f9fe`, all three final gates are
green:

- CI #473 — SUCCESS, including all tests, nationwide budget proof, N03
  benchmarks/phases, reproducible prepared-data verification, queue lifecycle,
  and production build;
- National rain proof #177 — SUCCESS;
- N03 national prefecture index proof #97 — SUCCESS.

This closes the **scan -> queue -> worker -> municipality proof** architecture
gate. It does not authorize Production integration.

Still forbidden:

- do not apply the proof queue/result migration to Production;
- do not connect nationwide proof results to Push or `watch_targets`;
- do not merge/deploy PR #59 merely because this proof path is green.

Next engineering gate: define the scheduler/orchestration that invokes the
protected scan and worker at the intended cadence, with failure/retry behavior
that remains isolated from user alert delivery. Reconcile the repository's
migration/source-of-truth representation of the private N03 bucket's current
50 MiB object limit before Production rollout.

> 全国計算は共通処理。ユーザーごとの5分監視とは混ぜない。
> scanから市区町村確定までは閉じたproofとして完成。通知はまだつながない。


### Nationwide scheduler/throughput correction — 2026-09-30

The earlier overview wording closed the nationwide architecture gate too early.
The implementation review after that checkpoint found and fixed request-level
atomicity: all forecast frames are now scanned successfully before a single
combined enqueue is attempted. A later-frame failure therefore returns 503
without partially enqueueing earlier frames.

The protected scan path uses JMA `nowc/.../surf/hrpns`. Its target-time
contract does not contain a `member` field; the separate `rasrf` contract
does. Do not import the old rasrf/member requirement into this nowc/hrpns queue.

The isolated proof scheduler migration exists, but its original fixed
`50 jobs x 2 worker calls / 5 minutes` capacity is **not** considered
Production-ready. Six zoom-4 coarse tiles can theoretically map to as many as
1,536 distinct zoom-8 refinement tiles per forecast frame, so fixed capacity
can backlog under severe conditions.

Worker safety has since been strengthened:

- a 45-second internal execution budget prevents intentionally starting work
  all the way to the 60-second route ceiling;
- deadline-deferred claimed work returns to PENDING without consuming a retry
  attempt, proven in both worker tests and the PostgreSQL queue lifecycle;
- prepared N03 Storage loads now use a per-invocation cache plus single-flight
  in-flight sharing so concurrent jobs requesting the same prefecture do not
  duplicate the initial Storage download;
- the worker is being changed from one large upfront claim/serial loop to
  bounded batches: claim up to four jobs, process that batch concurrently,
  re-check the deadline, then claim the next batch. Unclaimed work remains
  PENDING naturally.

Verified checkpoint before the bounded-batch change:
CI #485 succeeded with the N03 single-flight unit test, live N03 phases,
queue lifecycle, and production build. The bounded-batch worker and its
concurrency/deadline tests are now the active proof and must pass CI before the
throughput gate can be reconsidered.

**Scheduler/throughput gate remains OPEN.** Do not apply the proof migrations,
create Production nationwide cron jobs, connect Push/watch_targets, or merge
PR #59 on the basis of the earlier gate wording.

> 未来のソラを信用するな。atomicity と throughput は別ゲートで確認する。

### Throughput evidence correction and reproducible stress proof — 2026-09-30

At head `78cdb884cfbceed15b355801faf2b6413ba53ff1`, all workflows completed:
CI #494, National rain proof #198 and N03 index proof #118 — SUCCESS.
CI #494's live sample was **not skipped**: frame 20260930060000 /
20260930060500, zoom-8 tile 221/107, 129 strong pixels, prefectures 46/47,
zero intersecting municipalities, 1 job in 7,322.81 ms, end RSS 452.58 MiB.
The logged 6.15 jobs/45s is an extrapolation, not an accepted capacity.
The old 84.6 jobs/45s empty-rain sample is also NOT accepted.

Review found that this live script was serial and included MLIT ZIP generation
in its timed section. It did not measure the bounded concurrent production
worker or private prepared Storage HTTP. A zero municipality result can be a
correct offshore intersection result; it does not prove a positive land match.

The bounded-batch worker implementation is complete (default concurrency 4,
claim at most four, finish batch, check deadline, next claim). The earlier
"being changed" wording is historical. Atomicity tests and CI are green.
**Atomicity gate and throughput gate are separate. Throughput gate remains OPEN.**

New proof tooling executes the actual worker against local-only queue/result
RPC stubs, including result JSON serialization. The live proof now examines all
forecast frames, records per-frame candidate queue size, selects at most four
jobs, fetches JMA zoom-8 tiles during each cold/warm measured invocation, and
uses the production single-flight Storage-loader code over local prepared N03.
MLIT generation runs outside worker timing in a separate process. No real DB
client, queue write or Production Storage mutation is used.

Always-run synthetic stress uses 256x256 manufactured strong-rain PNGs, dense
and fragmented patterns, concurrency 1/4, 50 offered jobs, and a separate
Hokkaido case with real N03 detail. It requires positive exact municipality
intersections, captures each batch duration, pending work and process peak RSS,
and verifies one load per selected prefecture. Synthetic rain is load testing,
never meteorological evidence. Each case starts a fresh process. CI retains
live/stress logs as `national-rain-throughput-evidence` even on failure.

Limitations to keep explicit: local DB RPCs exclude database network latency;
local prepared Storage excludes private Storage HTTP; CI Node is not the Vercel
runtime; repeated shapes do not bound diverse nationwide-prefecture memory.
A 45-second start-work budget is not a hard end-time guarantee: the last batch
may complete afterward. Its tail and RPC overhead must fit the 60-second route.
No small-sample jobs/45s extrapolation is a Production-safe job limit.

Adopted at this checkpoint: keep isolated endpoints and bounded batches;
retain concurrency=4 / budget=45s as proof defaults, not accepted sizing.
Do not endorse limit=50 or the two worker calls/5 minutes. The scheduler stays
unapplied until measured safe sustained capacity, invocation count and memory
cover arrivals/backlog, including multiple frames and up to 1,536 tiles/frame.
Record final CI measurements in the next checkpoint rather than overwriting
this evidence history.

Remaining Production work (all deliberately unexecuted): proof DB migrations;
dedicated scan/worker secrets and cron/Vault; runtime-equivalent read-only
Storage/DB latency and memory validation; load-driven scheduler acceptance;
PR #59 merge/application deployment. Push/watch_targets integration is a later,
separate review. Existing watch-rain and immutable N03 objects stay untouched.

> 未来のソラを信用するな。重要な判断は総覧へ残す。
> atomicity gateとthroughput gateは別。成功したCIと採用できる処理能力も別。

### Measured scheduler rejection and exact footprint optimization — 2026-09-30

At `20174bd1452dabecc3b0fb6f57e0dcc44e5bfe46`, CI #495, National rain
proof #199 and N03 index proof #119 all completed SUCCESS. Full structured
evidence (including frame counts and batch times) is retained in
`docs/proofs/national-throughput-ci495.json`; the raw CI artifact is
`national-rain-throughput-evidence`, artifact ID 11080624457.

| Sample | Concurrency | Done / offered | Elapsed | Process peak RSS |
| --- | ---: | ---: | ---: | ---: |
| Live, cold prepared | 4 | 4 / 4 | 1.220 s | 470.45 MiB |
| Live, warm prepared | 4 | 4 / 4 | 0.135 s | 470.45 MiB |
| Dense raster + 7 prefectures | 1 | 11 / 50 | 45.890 s | 416.54 MiB |
| Dense raster + 7 prefectures | 4 | 12 / 50 | 49.386 s | 495.60 MiB |
| Fragmented raster + 4 prefectures | 1 | 50 / 50 | 5.881 s | 532.78 MiB |
| Fragmented raster + 4 prefectures | 4 | 50 / 50 | 5.775 s | 538.17 MiB |
| Dense Hokkaido raster | 4 | 48 / 50 | 48.242 s | 1,000.64 MiB |

Live discovery requested 31 refinement tiles over all supplied forecast frames.
The four measured jobs had 180 strong pixels in total, loaded prefectures
13/46/47 once each, and intersected zero municipalities. Synthetic cases
independently proved positive exact municipality intersections: dense c4
3,096 hits, fragmented c4 1,200 hits, Hokkaido 2,112 hits (sums over repeated
jobs, not counts of distinct municipalities). These manufactured images are
not evidence of real rain in those places.

**The original fixed scheduler is rejected by measurement.** In the dense
c4 case only 12 jobs finished, with 38 still pending and a maximum batch of
17.090 s. Concurrency 4 did not give a fourfold CPU gain on a single JS process.
Two calls did not prove 100 jobs/5min; two similar dense invocations would
complete only about 24 jobs. Even that estimate excludes HTTP/DB overhead.
The 17.09-second measured batch also exceeds the 15-second reserve between
the 45-second start-work cutoff and the 60-second route ceiling. Starting a
similar batch at second 44 can exceed the route ceiling. Hokkaido's roughly
1 GiB peak makes nationwide multi-prefecture cache growth an additional gate.

The dense polygon's raster boundary contained many redundant collinear points.
The next feature-branch fix removes only intermediate points on straight grid
edges before converting to geographic coordinates. A full 256x256 occupied
tile retains exactly its four boundary corners plus closure. Every turn, dry
hole and concavity remains; polygon/municipality ordering stays unchanged.
This is exact boundary reduction, not a bounding-box substitution or a
tolerance-based approximation. Dense extent, hole and concavity tests lock it.
Re-run the same CI stress matrix before accepting any claimed speed-up.

No safe Production job count or invocation rate is adopted yet. A route's
50-job cap implies at least 31 invocations for 1,536 tiles in one frame even
if all 50 finish; multiple frames multiply that demand. This is only a
count lower bound, not measured safe drain capacity. Replacement scheduling
must have bounded global invocation concurrency, backlog/oldest-job-age
observability, explicit stale-frame handling, and measured memory/last-batch
headroom. Do not fix the backlog by silently dropping rain candidates.

The isolated proof/data path and reproducible measurements are complete;
the throughput/scheduler acceptance gate remains OPEN. All Production actions
listed above remain unexecuted. Continue safely on the feature branch.

### Optimized worker proof result / Production hold — 2026-09-30

Code commit `ba9a0b0360ab9cf30a1431f4ce8fb3a2b0a2576e` completed all gates:
CI #496 — SUCCESS (164 tests, live throughput, all five stress cases, local
PostgreSQL queue lifecycle and build); National rain proof #200 — SUCCESS;
N03 index proof #120 — SUCCESS. Evidence is retained in
`docs/proofs/national-throughput-ci496.json`, raw artifact ID 11080733870.

| Optimized sample | Concurrency | Done / offered | Elapsed | Max batch | Process peak RSS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Live JMA, cold prepared | 4 | 4 / 4 | 1.035 s | 1.034 s | 727.48 MiB |
| Live JMA, warm prepared | 4 | 4 / 4 | 0.097 s | 0.096 s | 727.48 MiB |
| Dense raster + 7 prefectures | 1 | 50 / 50 | 7.356 s | 0.530 s | 664.91 MiB |
| Dense raster + 7 prefectures | 4 | 50 / 50 | 7.789 s | 0.944 s | 761.04 MiB |
| Fragmented raster + 4 prefectures | 1 | 50 / 50 | 2.933 s | 0.409 s | 398.54 MiB |
| Fragmented raster + 4 prefectures | 4 | 50 / 50 | 2.822 s | 0.589 s | 540.95 MiB |
| Dense Hokkaido raster | 4 | 50 / 50 | 7.049 s | 1.042 s | 1,017.12 MiB |

The dense benchmark changed from 12 jobs / 49.386 s to 50 / 7.789 s at c4;
compare per-job workload, not just unequal invocation totals. Exact municipality
hit counts per repeated job remain unchanged: dense 258, fragmented 24,
Hokkaido 44. CPU-heavy work does not benefit substantially from async c4;
its benefit is overlapping network waits, with increased memory to consider.

The live proof observed 23 requested refinement tiles across **12 official
forecast frames** and measured four jobs with 131 strong pixels total. Actual
JMA retrieval, full zoom-8 scan, exact footprint, prepared N03 parsing and exact
intersection ran inside the actual bounded worker. The selected land matches
were zero; synthetic proofs cover positive intersections separately. Each
selected prefecture (01/13/46/47) loaded once. Live images are not frozen across
CI runs, so the live result is not a before/after speed benchmark.

Decisions, deliberately separated from Production sizing:

- Accept the exact collinear-boundary optimization and the reproducible worker
  harness. Retain concurrency 4 and 45-second budget as **proof defaults**.
- 50 jobs is now demonstrated for these synthetic cases, not a safe universal
  Production limit. Do not turn four sparse live jobs into jobs/45s capacity.
  Private Storage HTTP and result/claim/finish DB network latency are still
  excluded; CI hardware is not the target Vercel runtime.
- The observed stress batches now fit within 15 seconds, but this is an
  observation, not a bound on JMA/Storage/RPC latency. The 45-second start-work
  cutoff alone still cannot guarantee completion within the route's 60 seconds.
- Memory gate remains open: Hokkaido peaked near 1 GiB even in isolation;
  the per-invocation N03 cache has no nationwide retained-byte bound. Need
  diverse-prefecture sustained tests, explicit memory allocation/headroom,
  and a bounded retention/admission policy before accepting worker sizing.
- Reject the fixed `worker limit=50 x 2 calls/5min` scheduler as nationwide
  coverage capacity. With 12 frames the 1,536/frame theoretical bound is
  18,432 jobs/scan; even if all 50 jobs complete per call, that needs at least
  **369 invocations per scan** when frames can share a batch. This is a demand
  lower bound, not permission to launch 369 calls or a measured safe rate.
- A replacement should drain on observed backlog under a global invocation
  cap, record pending count and oldest job age, and explicitly handle obsolete
  forecast frames. It must pass sustained arrival/drain and memory tests with
  real IO before any cadence or global concurrency is adopted. No silent
  candidate drop, unbounded fan-out or coupling to watch-rain is acceptable.

**Completed before Production:** isolated scan/atomic queue/worker/N03/result
proof implementation; immutable 47-prefecture data already verified; actual
worker load measurement; exact boundary optimization; positive municipality
stress evidence; CI/log retention and this handoff. Atomicity gate is closed.

**Not completed / not executed:** throughput/scheduler acceptance; bounded
nationwide memory and target-runtime real-IO/drain validation; accepted safe
job limit or invocation count; Production proof DB migration, cron/Vault or
secret changes; PR merge/application Production deployment; Push/watch_targets
connection. The unchanged scheduler SQL is an unaccepted proof draft, not a
rollout plan. Stop before Production modifications; do not describe this PR as
Production-ready merely because CI #496 succeeded.

> 未来のソラを信用するな。重要な判断は総覧へ残す。
> atomicity gateとthroughput gateは別。計測は完成、Productionの処理能力承認は未完了。

### Hokkaido partition design checkpoint — 2026-09-30

Continue with exact original Polygon-component chunks and bbox preselection,
not four fixed Hokkaido geographic regions. Offline prototype and reproduction
commands are in `docs/N03_PARTITION_DESIGN.md`; application loader is unchanged.
All 9,556 components reconstruct exactly, and all 37 ordered query results match
the whole loader. Local N03-only peak RSS changed from 402.71 to 152.11 MiB;
elapsed changed from 1.191 to 1.539 seconds. This is not actual worker sizing.
46 chunks have a soft 1 MiB target; one indivisible polygon makes a 1.27 MiB
chunk. No strict 1 MiB memory claim is accepted.

Read-only metadata of all 47 verified prepared objects identifies Hokkaido,
Nagasaki, Iwate, Miyagi, Kagoshima, Okinawa and Mie as priority candidates.
Generic format applicability is established by design; real-data performance
and equivalence outside Hokkaido are not yet established. Evidence snapshots
are retained under `docs/proofs/`. CI now repeats the Hokkaido local partition
comparison using its existing prepared-data cache, with no Production access.

Next: hardened manifest validation, invocation-wide chunk single-flight and
bounded decode/cache admission, then actual c1/c4 worker plus real-IO/drain
measurements. Region parallelism still requires unique tile ownership, neighbor
intersection and a global invocation cap. No scheduler sizing is accepted yet.
Baseline before this checkpoint: `981de532300521579c3c2caeeaf583e5b216b95d`,
CI #497 / National #201 / N03 #121 all SUCCESS. Follow-up CI is associated with
the partition-design commit in PR #59; logs are retained as CI artifacts.

Production migration/cron/Vault/deploy/merge, new partition uploads and
watch_targets/Push integration remain unexecuted. Existing Storage data is
unchanged. **atomicity gateとthroughput gateは別。**
**未来のソラを信用するな。重要な判断は総覧へ残す。**
