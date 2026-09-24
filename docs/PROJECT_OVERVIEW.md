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

### Immediate next work

1. Implement the approved watch ON/OFF visual state (ON = light yellow-green, OFF = neutral), test, PR, CI, deploy.
2. Implement explicit Push permission/subscription UX for installed PWA and persist to `push_subscriptions`.
3. Add Push handling to the service worker.
4. Add server-side Web Push delivery to the watcher without changing meteorological meaning.
5. Correct notification bookkeeping so `last_notified_at` is written only after successful Push delivery.
6. Test Android installed PWA Push, then iPhone home-screen PWA Push.
7. Add episode dedupe/cooldown behavior needed to prevent repeated notices for the same rain episode.

> 第3条：ソラの「入れた」は、実物を見るまで信用するな。
