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

## 🚨 ABSOLUTE LIFE-SAFETY RULE — 最上位・例外なし 🚨

> **人命に関わる情報について、EmergencyAlert / アメくるは推定を事実として断定しない。**
>
> **観測・公式発表・予測・推定を必ず区別する。**
>
> **不明・取得失敗・データなしを「安全」と解釈しない。**
>
> **危険を過小評価する断定も、根拠なく危険を煽る断定もしない。**

This rule is above feature behavior, notification wording, AI presentation,
optimization and convenience. It applies project-wide to rain, inundation,
flooding, rivers, landslides, evacuation information and every future
life-safety feature.

- Never say 「安全です」「浸水しません」「避難の必要はありません」 merely
  because data is absent, incomplete, stale or below an app-defined threshold.
- Never say 「現在○cm冠水しています」「必ず浸水します」 unless an authorized
  source or direct observation actually establishes that fact at the relevant
  place/time.
- A forecast remains a forecast. A risk estimate remains an estimate. A hazard
  map describes modeled/potential hazard; it is not evidence of current water
  depth.
- When evidence supports only possibility or rising risk, wording must preserve
  that uncertainty: e.g. 「浸水の危険が高まる可能性があります」.
- If an official/authorized source confirms occurrence, EmergencyAlert may
  report that confirmation while retaining source, place and valid-time
  context.
- AI/personality layers may simplify expression but may never strengthen the
  certainty of the underlying semantic event.

Engineering shorthand:

> **推定を事実にしない。分からないを安全にしない。命に関わる断定を勝手に作らない。**

The existing rules `UNKNOWN_PIXEL != NO_RAIN`, `FETCH_ERROR != NO_RAIN` and
`NO_DATA != SAFE` are concrete implementations of this constitution, not
isolated rain-only exceptions.

## Product north star — 普段は洗濯物、必要な時は大切な場所を見守る

User-side principle:

> **知りたいことを、知りたい人に、知らせたいタイミングで。**

EmergencyAlert / アメくる？ should normally feel like a small everyday utility,
not a disaster app that constantly demands attention. Its ordinary face is the
original laundry use case: notice useful rain early enough to bring washing in
or tell someone you care about.

The same registered places become more important when conditions become severe.
A saved place is therefore not merely a weather-query coordinate. It is a
**「見守りたい場所」**.

Examples include:
- 自宅
- おかあさんち
- 子供の学校
- other places the user chooses to care about

The user does not need to be physically present at a registered place for it to
matter. EmergencyAlert may watch official/authorized information relevant to
that place and surface meaningful change when the evidence and timing justify
it.

The intended escalation is:

> 普段の雨 → 強い雨 → その場所の公的な危険度情報 → 必要なら避難・生活支援情報

The application should stay quiet when nothing useful has changed. When the
situation becomes serious, it may shift from everyday rain assistance toward
life-safety support without changing the fundamental product relationship.

> **普段は洗濯物を守る。必要な時には、大切な人や場所を気にかけるきっかけを届ける。**

### Flood / water-disaster roadmap

A future water-risk layer may combine, while keeping provenance separate:

1. official rainfall observations and forecasts;
2. official inundation/risk indices such as surface-water risk information;
3. static hazard-map / terrain vulnerability information;
4. direct observations or official confirmed occurrence where available.

These categories MUST NOT be collapsed into one apparent fact. In particular:
rainfall alone must not be converted into an invented current water depth, and
scenario-based hazard-map inundation depth must not be presented as current
observed flooding.

Future semantic provenance should preserve distinctions such as:
`OBSERVED`, `FORECAST`, `RISK_INDEX`, `STATIC_HAZARD`, and `INFERRED`.

### Evacuation and life-support roadmap

When serious risk is relevant to a watched place, the product should eventually
help the user reach the next useful information rather than stopping at
「注意してください」.

Potential chain:

> risk near watched place
> → disaster-appropriate designated emergency evacuation places / shelters
> → current opening/availability status when an authoritative source provides it
> → water-supply points and other life-support information when authoritative
>   current data is available
> → hand off the selected destination to a navigation service such as Google Maps

Do not equate nearest with safest. A place must not be recommended merely
because it is geographically closest; disaster type, official designation,
current status and available evidence matter.

Likewise, a normal navigation route is **not** automatically a safe disaster
evacuation route. Flooded roads, underpasses, rivers, closures and other hazards
may make an ordinary shortest/fastest route unsuitable. Until authoritative
route-safety evidence exists, the UI should say things such as
「Googleマップで経路を確認する」 rather than 「安全な避難経路」.

### 「逃げ地図」 as a conceptual origin

The user's earlier inspiration for the evacuation side of this project is
「逃げ地図」 (Nigechizu). The important idea to inherit is not merely plotting
shelters on a map, but helping people think about **where to go, how long it may
take, and how route/timing relate to hazard conditions**.

EmergencyAlert should not copy or claim to replace Nigechizu. Its distinct
direction is to connect that human-centered evacuation concept with
place-specific, time-sensitive, authoritative information and the user's
already-watched places.

Long-term experience:

> 雨が来る
> → いつもの雨ではないことに気づく
> → 見守りたい場所の危険情報を確認する
> → 必要なら適切な避難先・支援情報を確認する
> → 行き方をナビで確認する

This roadmap remains subordinate to the ABSOLUTE LIFE-SAFETY RULE above.
Convenience, personalization, urgency and navigation must never promote an
estimate into a fact or an unknown state into safety.

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

Code commit `ba9a0b0360ab9cf30a1431f4ce8fb3a2b0a2576e` passed all listed CI workflows:
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

Follow-up local actual-worker proof also completed: partitioned Hokkaido c1
50/50 in 11.292 s / peak 310.58 MiB, c4 50/50 in 11.177 s / peak 453.43 MiB,
44 exact hits/job. The prototype admits only one N03 resolver at a time across
the invocation and retains no decoded geometry. Its 650 chunk reads per run
exclude HTTP/DB latency; this does not approve a Production IO policy. CI runs
these fresh-process variants as well. Prototype application integration and
bounded-cache/real-IO validation remain uncompleted.

### Partition CI evidence / Production hold — 2026-09-30

At `57c22e9bbf68226b6b432371f6e9307c3106ff06`, CI #499 (169 tests,
partition proofs, queue lifecycle and build), National #203 and N03 #123 all
completed SUCCESS. Full structured evidence is retained in
`docs/proofs/national-throughput-ci499.json`, artifact ID 11083582169.

| Same-CI Hokkaido actual worker | Done | Elapsed | Max batch | Peak RSS |
| --- | ---: | ---: | ---: | ---: |
| Whole prepared loader, c4 | 50 | 11.272 s | 1.487 s | 786.42 MiB |
| Partition prototype, c1 | 50 | 15.390 s | 0.380 s | 176.05 MiB |
| Partition prototype, c4 | 50 | 14.476 s | 1.255 s | 323.62 MiB |

Each has 44 exact hits/job. Whole vs partitioned c4 shows lower observed memory
and slower processing under the same repeated synthetic workload. N03-only
37-query peaks were 336.06 vs 153.86 MiB; ordered arrays all matched. The
prepared SHA256 also matches the local official-source proof. There is no
Production HTTP/DB or Vercel-runtime capacity claim.

Completed: reproducible exact partition generation, local integrity checks,
result equivalence, actual-worker memory/time proof, CI retention and other
prefecture priority ranking. Uncompleted: application loader integration,
manifest hardening, bounded cache with real-IO and diverse-tile tests, sustained
backlog drain and accepted scheduler sizing. Current prototype's one N03 slot
and zero geometry retention are a measured baseline, not a final cache policy.
All Production actions and partition uploads remain unexecuted.

**atomicity gateとthroughput gateは別。** Throughput/scheduler acceptance remains
OPEN. **未来のソラを信用するな。重要な判断は総覧へ残す。**

### Representative/cache/communication/drain continuation — 2026-09-30

Baseline `2a7471c` / CI #500 is confirmed. Added reproducible representative
proofs for 01/42/03/47 (83 ordered queries), strict manifest/chunk checks,
bounded cache, HTTP sensitivity, sustained real worker calls, separate-process
region comparisons and measured-service arrival replay. Application routes and
Production resources are unchanged. See `docs/NATIONAL_RAIN_READINESS_PROOF.md`.

Local exploration rejected decoded geometry LRU (estimated 128 MiB charge):
Iwate warm reads kept thrashing and national mixed work exceeded comfortable
route headroom. Replacement retains at most 32 MiB of encoded Buffer bytes,
shares loads, pins users, decodes one chunk at a time and retains no geometry.
Some original polygons exceed 1 MiB; Iwate has a 4.13 MiB chunk, never clipped.
Every representative's whole/uncached/cached ordered results match.

Local sustained proof: 576 submitted/completed, zero pending, 36 invocations,
peak RSS 430.45 MiB; final RSS about 414 MiB. This is accelerated filesystem
work with virtual five-minute timestamps, not a live hour of network backlog.
Local region-specific cap2 invocations outperform mixed-region cache churn;
actual separate-process comparisons and 3-second offsets are retained.
Measurements overlapped during local exploration: final causal comparisons and
sizing decisions await sequential CI. Evidence is in
`docs/proofs/national-readiness-local.json`.

No private Storage GET credential/downloader is available; new partition data
is not uploaded. Read-only localhost HTTP uses actual JSON with explicit
80ms/8MiB-s and 250ms/2MiB-s sensitivity inputs, never claims measured Supabase
latency. No Vault/policy/Storage changes are made to obtain measurements.

Provisional next proof candidate: region-scoped jobs, c4, limit16, global cap2,
3-second initial offsets and backlog-based refill/fairness. This is not accepted
Production scheduling. Replay already shows substantial overload at severe
1,536/18,432-per-cycle demand; pending jobs and oldest age remain visible.
Four representative groups do not validate ten nationwide ownership groups.
Runtime/real-IO/DB/timeout/ownership/stale-frame gates remain OPEN.

**Production移行不可。atomicity gateとthroughput gateは別。**
**未来のソラを信用するな。重要な判断は総覧へ残す。**

### Sequential CI readiness result / final gate — 2026-09-30

Code `a80652ddeb5503e1d5e5f5931fda3863c265090c`: CI #501, National #205,
N03 #125 all SUCCESS; 179 tests, local queue lifecycle and build passed.
Raw artifact 11086367848; exact structured results:
`docs/proofs/national-readiness-ci501.json`. All measurements below are sequential
CI, with the documented synthetic/local HTTP assumptions. They are not measured
Production Storage latency or target-runtime capacity.

| N03-only representative (queries) | Whole sec / RSS MiB / read MiB | Bounded partition sec / RSS MiB / read MiB |
| --- | ---: | ---: |
| Hokkaido (37) | 1.154 / 331.86 / 39.68 | 1.839 / 180.83 / 74.42 |
| Nagasaki (8) | 0.494 / 245.62 / 28.38 | 1.041 / 179.09 / 29.16 |
| Iwate (8) | 0.479 / 236.20 / 27.48 | 0.993 / 183.93 / 28.17 |
| Okinawa (30) | 0.472 / 211.04 / 17.69 | 0.683 / 146.29 / 18.18 |

All **83 ordered results match** whole/uncached/cached. Full-coverage queries
and cache churn make cumulative partition reads exceed a single whole load;
partitioning is a memory reduction, not a universal IO/time reduction.
Original boundaries/holes are retained; largest Iwate chunk is 4,333,892 bytes.

Actual c4 Hokkaido worker over nominal HTTP, 50 jobs: whole cold 13.243 s /
836.60 MiB / 39.68 MiB transferred (1 GET), bounded cold 13.300 s /
371.80 MiB / 12.16 MiB (13 GETs). Bounded warm 10.339 s / 373.81 MiB /
zero GETs and zero bytes. c1 bounded cold 13.194 s / 263.09 MiB: c4 provides
no meaningful gain on this repeated CPU workload. For isolated regions c4,
32 cold jobs: Nagasaki 11.780 s / 372.83 MiB, Iwate 15.537 s / 431.70 MiB,
Okinawa 8.899 s / 353.99 MiB. All their warm phases perform zero GETs.
Constrained Hokkaido cold 32 jobs: 16.174 s, max batch 10.367 s.

**Reject nationwide mixed cache locality.** Mixed four-region c4 16 jobs cold
55.919 s / warm 55.802 s, each 244 GETs and 250.35 MiB transferred; its maximum
batch is 14.062 s. A nominally warm cache does not mean cache hits when the
working set exceeds 32 MiB. Near-60-second completion without real JMA/DB is
not a safe route limit. The initial 45-second budget only controls batch starts.

Sustained actual worker filesystem stress: 12 accelerated cycles, 48 arrivals
per cycle, 576/576 completed, zero pending/oldest age, 36 invocations, 156.225 s
wall time. Peak RSS 366.66 MiB; first/last 3-cycle sampled maxima 338.99/344.86
MiB. Encoded retained bytes peaked at 33,550,023 (<33,554,432 limit), 8,755
LRU evictions, one active load/decode maximum. Mixed workload had **zero cache
hits and 9,450,485,424 bytes read**. Bounded retention is verified; this does
not certify hour-long network arrivals or an absolute V8 RSS bound.

| Four cold invocations, 16 offered each | Wall sec | Summed sampled worker peak RSS MiB |
| --- | ---: | ---: |
| National mixed, global cap2 | 102.369 | 635.13 |
| Region-specific, global cap2 | 19.272 | 673.47 |
| Region-specific, 3s offsets, cap2 | 18.118 | 702.06 |
| Region-specific, cap4 | 15.160 | 1167.79 |

National mixed finishes only 48/64 offered; regional alternatives finish 64/64.
Do not conflate elapsed times for unequal completed work. Region isolation
reduces repeated loads and protects other regions from mixed-cache churn.
Three-second offsets provide no demonstrated memory benefit (702 vs 673 MiB);
keep them as a sensitivity candidate, not an accepted improvement. Cap4 buys
about four seconds over cap2 but increases aggregate memory materially; reject
it as the default without runtime memory allocation and higher-demand proof.

Measured-service replay (12 virtual 5-minute cycles, 1.5x service margin):

| Jobs/5min | Policy | Submitted / completed / remaining | Oldest sec | Calls |
| --- | --- | ---: | ---: | ---: |
| 48 | national | 576 / 576 / 0 | 0 | 48 |
| 384 | national | 4608 / 1128 / 3480 | 3000 | 96 |
| 384 | regional or staggered | 4608 / 4608 / 0 | 0 | 288 |
| 1536 | national | 18432 / 1128 / 17304 | 3600 | 96 |
| 1536 | regional or staggered | 18432 / 8944 / 9488 | 2100 | 561 |
| 18432 | regional or staggered | 221184 / 8944 / 212240 | 3600 | 561 |

At 384/5min with 75% Hokkaido, regional/staggered still completes 4608/4608;
national leaves 3480. These are model outputs calibrated from cold worker
service, not live sustained Production drains. The staggered replay uses the
same regional calibration plus eligibility offsets; it does not independently
establish a throughput improvement. Four representative groups cannot validate
ten nationwide groups. Even one-frame severe 1536/5min fails: gate remains OPEN.

Adopt for further proof: exact component partitions, encoded 32 MiB LRU,
identity/integrity checks, regional locality. Next dispatcher experiment uses
c4 (compare c1), region-scoped limit16, global cap2, zero initial offset as the
baseline and 3s as a comparison; backlog-driven refill instead of two fixed
calls. The 384 replay needs 24 calls/5min (288/12), not two. This is a measured
scenario requirement, not approved Production frequency. Safe universal limit,
Production call count, geographic group count and final offsets remain unset.
Monitor pending/processing/oldest age by region+frame, arrival/completion rate,
invocations/5min, retries/deferred/failures, batch/HTTP tails, RSS, cache churn,
and global leases. Alert at oldest age >=300s or consecutive queue growth.

A follow-up measurement-report fix scopes maxReadMs to each cold/warm phase;
CI #501's maxReadMs was cumulative, so use per-phase requests/bytes and maxBatchMs
above. The fix does not change worker processing, timing or these conclusions.

**Production移行不可。Atomicity gate closed; throughput/scheduler gate OPEN.**
Remaining: authorized real Storage/DB/JMA IO, trusted immutable partition
placement, all-47 validation/diverse tiles, Vercel-runtime memory and last-batch
timeouts, atomic region ownership/global leases/fairness, audited stale-frame
policy and severe-demand sustained real-IO drain. No Production migrations,
cron/Vault/Storage changes, notification connections, PR merge or Production
deploy are executed. New loader remains proof-only, absent from application routes.


### Supplemental cold-batch admission proof — 2026-09-30

Evidence: `docs/proofs/national-readiness-supplement.json`, local sensitivity
using the same scripts as CI #501; local hardware is not directly comparable
with the CI runner. Constrained loopback HTTP (assumed 250ms/request, shared
2MiB/s), c4 / 16 offered: Iwate completes 16 in 22.817s, peak RSS about445MiB,
19 GETs, maximum cold batch **19.018s**; Nagasaki completes16 in16.990s,
maximum cold batch13.867s. Warm phases issue zero GETs. Mixed nominal c4/8
still requires122 GETs in each cold/warm phase and about28seconds.

A 19.018-second cold batch exceeds the15-second reserve after a45-second
start cutoff: beginning such a batch at second44 can exceed60seconds before
final DB RPCs. Limit16 is a conditional proof setting, **not an accepted safe
Production limit**. Remaining-time admission, cancellation, bounded fetches
and final RPC budgets require further implementation and target-runtime proof.
Throughput/scheduler gate remains OPEN; no Production actions are authorized
by these measurements. Approximately10 future ownership groups (Hokkaido,
Tohoku, Kanto, Hokuriku/Koshin, Tokai, Kinki, Chugoku, Shikoku, Kyushu, Okinawa)
are a design candidate only: four measured workload classes do not validate
all47 prefectures, geographic ownership or neighboring-prefecture detection.

**atomicity gateとthroughput gateは別。**
**未来のソラを信用するな。重要な判断は総覧へ残す。**


### Follow-up CI #502 SUCCESS — 2026-09-30

Runtime code `c8da0d9c702fd9093aebebef6a6f8222b06561a9`: CI #502,
National #206, N03 #126 all SUCCESS. Artifact11087306586 / run36693482756;
full structured evidence: `docs/proofs/national-readiness-ci502.json`.
The report-only maxReadMs correction is verified: single-region warm phases
have zero GETs, zero bytes and maxReadMs0. All83 ordered representative queries
still match, and cache peak retained bytes remain below32MiB.

Repeated nominal localhost HTTP Hokkaido50jobs c4: whole15.990s /1038.63MiB
process peak RSS versus encoded16.716s /374.86MiB; c1 encoded16.795s /264.13MiB.
Measured transfer bytes remain41,606,326 whole vs12,748,337 partitioned.
Timing and allocator peaks vary across CI runs: retain both CI501 and502,
not a best-run Production estimate. Sustained accelerated local worker again
finishes576/576 with zero pending in36 calls; wall204.89s, peak366.42MiB,
first/last three-cycle maxima338.98/326.49MiB. This is finite local evidence.

Separate-process repeat: nationalmixed cap2 completes48/64 in104.713s,
aggregate634.21MiB; regionalcap2 completes64/64 in22.356s /667.99MiB;
regional3s offsets21.0s /688.81MiB; regionalcap4 18.333s /1215.28MiB.
Again offsets do not lower measured memory. All profiles use assumed loopback
latency/bandwidth and synthetic dense rain, not private Production Storage IO.

Updated cold-service replay,12 virtual five-minute cycles /1.5x margin:
regional384/cycle finishes4608 with no remaining jobs using288 calls;
1536/cycle finishes7728, leaves10704, oldest2100s,485 calls;
18432/cycle leaves213456, oldest3600s. Compared with CI501, lower measured
service increases backlog; the decision remains **Production不可 / gate OPEN**.

Read-only live JMA discovery finds26 refinement candidates across12 frames;
selects4 jobs on Okinawa zoom8(218,107),333 upcoming strong pixels total.
Cold prepared N03 path completes4/4 in0.527s (discovery14.263s separately),
process peak253.61MiB; warm0.100s. Municipality intersection executes but returns
**zero municipality hits**: this is not land-impact throughput and cannot close
the gate. N03 is local prepared data through the existing Storage loader code,
not private Storage HTTP; result/queue RPCs remain local stubs.

Proof and decision materials are complete; final scheduler sizing, real IO,
all47 regional ownership, production loader integration, runtime deadline and
severe-load drain remain uncompleted. All Production changes, merge and deploy
remain unexecuted. Atomicity gate and throughput gate remain separate.


### PR #59 authoritative checkpoint after Work handoff — 2026-09-30

This checkpoint supersedes the older "all47/timeout ownership still unproven" wording below. It records the actual branch state at `3a6827ceb3458a45f2330c216492bbdf19de03e2`.

**Verified branch state**
- PR #59 remains OPEN / unmerged. No Production DB migration, cron, Vault, Storage mutation, watch-rain/Push connection or intentional Production deploy has been performed.
- CI #507 SUCCESS, National rain proof #211 SUCCESS, N03 national prefecture index proof #131 SUCCESS, All47 ownership proof #5 SUCCESS.
- CI #507: 38 test files / 187 tests passed; all proof stages, local queue lifecycle and build passed.
- All47 ownership proof: 47 prefectures, 502 partition chunks, 591 real-geometry queries, 355 positive queries; ordered municipality results match whole-data results. Eight byte-balanced proof owners are ~59.1 MB each.
- Deadline-tail proof: under assumed 250 ms/request + 0.5 MiB/s loopback sensitivity, an invocation offered 100 jobs, claimed only 2, hit ~42 s cancellation, deferred both, left 98 unclaimed, failed 0. This proves no job loss in the proof path when in-flight HTTP is cancelled.
- Existing evidence remains valid: exact polygon-component partitioning, encoded 32 MiB bounded cache, single-flight, bounded retention, regional-locality benefit, sustained 576-job local drain, and the finding that global cap4 materially increases aggregate memory.

**Critical integration gap**
The newest safety mechanisms are still proof-only and are NOT used by the application route:
- `app/api/rain/national-worker/route.ts` still calls `processNationalRainRefinementJobs()` and `createSupabaseN03AdministrativeAreaLoader()`.
- `lib/weather/rain/nationalRainWorker.ts` does not yet use AbortSignal admission/final reserve or in-flight cancellation.
- The partitioned 32 MiB loader, ownership/gather logic and `processDeadlineProofJobs()` live under proof scripts.
Therefore the branch has proved a safer architecture, but the actual Preview worker is not yet running that architecture.

**Scheduler draft is stale by design**
`supabase/migrations/20260930_create_national_rain_proof_cron.sql` still contains fixed `limit=50` primary + drain calls. Later evidence rejects fixed 50x2 as a rollout policy. Keep this migration unapplied and treat it only as historical proof scaffolding until replaced by the accepted dispatcher design.

**Architecture correction**
The all47 LPT ownership proof demonstrates deterministic, complete and byte-balanced ownership, but pure byte balancing scatters chunks from unrelated prefectures across owners. Earlier measurements show mixed-national cache locality performs poorly while region-local workers perform much better. Therefore LPT-bytes-only is evidence for ownership completeness, not the final deployment topology.

Preferred next architecture to integrate:
1. Preserve geographic/regional locality.
2. Partition heavy prefectures into exact original polygon-component chunks.
3. Load only intersecting chunks through the encoded 32 MiB bounded cache.
4. Use a small global invocation cap (cap2 remains the baseline candidate; cap4 is not accepted).
5. Add queue-aware refill/fairness rather than fixed worker calls.
6. Add real deadline admission + AbortSignal cancellation + explicit final DB-RPC reserve.
7. Gather partial owner results only after all expected chunk tasks complete; never publish incomplete municipality results.

**Open defects/gates before Production**
- Final DB claim/save/finish/defer RPCs are not yet bounded/cancelled by the same runtime budget.
- All47 ownership proof balances bytes, not measured traffic/CPU/RSS; the final region-local ownership map and hot-region sizing are not yet accepted.
- Queue-aware replay still uses representative measured service profiles, not measured all47 region service.
- Severe 1,536 jobs/5 min scenarios still back up in the current calibrated models; throughput/scheduler gate remains OPEN.
- Private Production Storage latency, real DB network latency, real JMA latency, Vercel runtime memory/headroom and sustained severe-load real-IO drain remain unverified.
- Stale-frame disposition, regional/global lease/fairness and final dispatcher cadence remain unresolved.
- The safer proof loader/worker path has not yet been integrated into the application route.

**Next implementation sequence**
Do not add more isolated proof variants first. Converge the proven pieces into one Preview-path implementation:
1. update this overview/PR checkpoint;
2. define the final region-local ownership strategy with heavy-prefecture chunking;
3. integrate partitioned bounded N03 loading into the actual national worker;
4. integrate admission reserve + AbortSignal cancellation + final RPC reserve into the actual worker;
5. implement queue-aware region-scoped claiming/dispatcher proof against that same code path;
6. measure Preview/authorized real IO;
7. only then decide scheduler cadence and whether throughput/scheduler gate can close.

Atomicity gate: **CLOSED**.
Throughput/scheduler gate: **OPEN**.
Production readiness: **NO**.

> 未来のソラを信用するな。proofで成立したことと、実routeに統合済みなことを分けて記録する。
> atomicity gateとthroughput gateは別。研究を増やすより、ここからは統合して同じコードパスで測る。


### Low-zoom screening discovery — 2026-09-30

Live JMA observation proof at frame `20260930113000` compared every z8 descendant pixel under the six nationwide z4 coarse tiles against its exact z4 parent pixel.

Result:
- 1,536 z8 tiles scanned.
- 393,216 z4 parent pixels compared.
- 6,078 z8 pixels were >=30 mm/h.
- **0 heavy-pixel misses**: every z8 >=30 mm/h pixel had a z4 parent >=30 mm/h.
- **0 parent max-rank misses**: for all 393,216 parent pixels, the z4 intensity rank exactly equaled the maximum z8 descendant rank.
- Exact max-rank match rate: **100%** in this frame.
- z8 GTE_80 parent groups: 15; all z4 parents were also GTE_80.
- No UNKNOWN_PIXEL values observed in either compared z4 parents or z8 descendants.

This is strong empirical evidence that, for this live hrpns observation frame, low zoom behaves as max-rank aggregation across the corresponding higher-resolution descendants. If this behavior is stable, nationwide work can be changed from "detail everywhere" to:
1. scan z4 nationwide;
2. keep only z4 pixels/cells >=30 mm/h;
3. refine only their z8 descendants.

This could reduce nationwide detail/N03 work dramatically and should be investigated before further scheduler scaling.

**Do not yet promote this to a hard invariant.** This is one live observation frame, not a published JMA contract. Repeat across multiple observation/forecast frames and diverse rain events before adopting the screening rule. In particular validate forecast targetTimes as well as current observations and confirm no z4<30 / z8>=30 counterexample.

Evidence: JMA low-zoom max-rank proof #1 SUCCESS, artifact 11094195166.


### Forecast low-zoom screening checkpoint — 2026-09-30

The future-frame screening idea was tested against live JMA forecast data.

All 12 forecast validtimes were scanned at zoom 4 first. In the CI #518 sample:
- naive nationwide zoom-8 work: 18,432 tiles (12 frames x 1,536 tiles/frame);
- zoom-4 >=30 mm/h candidates mapped to only 12 zoom-8 refinement tiles total;
- 18,420 zoom-8 tile fetches were avoided;
- observed reduction: **99.9348958%**.

Safety validation then exhaustively compared available zoom-8 descendants with their exact zoom-4 parents for the nearest, middle and farthest selected forecast frames:
- nearest frame 12:05: 1,536/1,536 zoom-8 tiles available; 4,667 zoom-8 >=30 mm/h pixels; **0 misses**; zoom-4 parent rank equaled descendant max rank for every compared parent;
- middle frame 12:30: 141/1,536 zoom-8 tiles available; 1,395 returned 404; among available data, 3,895 zoom-8 >=30 mm/h pixels; **0 misses**; exact parent=max rank for every compared parent;
- farthest frame 13:00: 51/1,536 zoom-8 tiles available; 1,485 returned 404; among available data, 3,471 zoom-8 >=30 mm/h pixels; **0 misses**; exact parent=max rank for every compared parent.

Interpretation:
- the low-zoom screening design shows extremely large observed load reduction;
- on every forecast zoom-8 tile that was actually available, no counterexample was found to the rule `z8 >=30 => parent z4 >=30`;
- exact max-rank behavior also held on every compared parent;
- however, the middle/farthest exhaustive proof lacked complete zoom-8 coverage because JMA returned 404 for many detail tiles;
- therefore **the hard screening contract is not yet universally confirmed**.

Missing tiles must remain NO_DATA/unavailable, never NO_RAIN. Before promoting `z4 <30` to a permanent exclusion invariant, add a land-aware/coverage-aware proof or otherwise establish why the missing higher-zoom forecast tiles cannot contain relevant rain.

The CI #518 overall failure occurred later in an older read-only live throughput measurement when a coarse JMA tile returned 404. That is separate from the low-zoom validation result. The live throughput proof has been adjusted to report this transient source unavailability as a skipped measurement without weakening Production queue fail-closed semantics.


### Forecast candidate refinement zoom checkpoint — 2026-09-30

CI #523 completed successfully. The candidate-only refinement probe used a fresh JMA forecast cycle with 12 validtimes from +5 to +60 minutes.

For every forecast frame:
- the six nationwide zoom-4 coarse tiles were fully available;
- every zoom-4 >=30 mm/h candidate's descendant tiles were then probed at zooms 5, 6, 7, 8, 9 and 10;
- **all requested candidate descendant tiles were available through zoom 10 for all 12 frames**;
- highestFullyAvailableCandidateZoom = 10 for every frame;
- no coarse-frame 404 occurred in this run.

Observed candidate footprint was tiny: roughly one z5-z7 tile, two z8 tiles, four z9 tiles, and 6-9 z10 tiles per frame. This is candidate-only refinement, not nationwide high-zoom enumeration.

The key architectural consequence is important: do not infer high-zoom forecast usability from nationwide exhaustive tile availability. Earlier exhaustive zoom-8 proofs saw many 404s because they requested all 1,536 descendants under the six coarse tiles. CI #523 shows that the tiles actually selected by zoom-4 >=30 candidates were available all the way to zoom 10 across the full +60 minute horizon in this cycle.

Preferred direction:
1. scan all forecast validtimes at zoom 4;
2. identify only zoom-4 cells >=30 mm/h;
3. refine only those candidate descendants, potentially directly to zoom 10 when available;
4. if a selected descendant tile is unavailable, preserve NO_DATA/fail-closed semantics rather than broadening or inventing rain;
5. perform municipality/alert work only on the refined candidate footprint.

This can reduce high-resolution work by orders of magnitude while preserving the product goal of finding future strong rain. It also means the earlier scheduler stress based on exhaustive nationwide zoom-8 refinement is likely a pessimistic architecture rather than the desired final design.

This is still empirical JMA behavior, not a published permanent contract. Continue collecting samples across different weather events. Keep z4<30 => safe to ignore as an evidence-backed hypothesis until enough counterexample-seeking runs have accumulated.


### JMA sparse-tile existence hypothesis test — 2026-09-30

CI #526 tested the hypothesis that high-zoom forecast PNG files are omitted (404) when their covered area is completely dry/transparent.

Result: **the hypothesis was falsified in this sample**.

Three forecast horizons were sampled (nearest, middle, farthest), with up to 100 z10 tiles selected from z4 child blocks containing precipitation data and 100 z10 tiles selected from z4 child blocks that were fully transparent.

For all three horizons:
- wet-class sample: 100/100 HTTP 200, 0 HTTP 404;
- dry-class sample: 100/100 HTTP 200, 0 HTTP 404;
- every dry-class HTTP-200 z10 PNG was itself **fully transparent**;
- wet-class z10 PNGs were almost always mixed transparent+opaque, with a few fully opaque tiles.

Observed totals across the three horizons:
- dry-class: 300/300 HTTP 200, 300/300 all-transparent PNGs, 0 HTTP 404;
- wet-class: 300/300 HTTP 200, 293 mixed transparent+opaque, 7 fully opaque, 0 HTTP 404.

Therefore JMA does create and serve fully transparent high-zoom PNG tiles. Earlier 404s cannot be explained simply by 'no rain => no file'. Treat those 404s as coverage/product-availability behavior until proven otherwise. Continue to preserve 404 as NO_DATA/unavailable, never NO_RAIN.


## 新チャット引き継ぎ用・最優先チェックポイント — 2026-09-30 23時台

この節を新チャットの起点として扱う。下の古いスケーリング研究より、まずこの最新方針を優先する。

### 現在位置
- Repo: `miyazaki1016/emergencyalert`
- PR: #59 `Add nationwide heavy-rain scan proof`
- Branch: `feat/national-heavy-rain-preview`
- PRはOPEN / 未merge。
- Production DB migration / cron / Vault / Storage mutation / watch-rain/Push接続 / Production deploy は実施していない。
- Atomicity gate: CLOSED。
- Production readiness: NO。

### いま最も重要な設計転換
以前は「全国z8を大量に処理する前提」でworker/scheduler/N03負荷を詰めていたが、最新のJMA実測により、最終設計は次を本命とする。

1. 12個の未来validtime（約+5〜+60分）をz4で全国粗走査。
2. z4で30 mm/h以上になった候補だけ残す。
3. 候補だけ高zoomへ掘る。CI #523では全12フレームで候補タイルがz10まで取得できた。
4. 高zoom候補だけ市区町村/N03判定する。
5. 取得不能はNO_DATA。404をNO_RAINにしない。

この方式では実測上、高zoom対象は極小。CI #523では1フレームあたり概ね z8=2枚、z9=4枚、z10=6〜9枚程度だった。全国z8総当たりを前提にした過去の1,536 jobs/frameストレスは、最終設計としては悲観的な旧前提になりつつある。

### z4スクリーニングの実測
- 観測1フレームでは、z8 >=30 mm/h の6,078ピクセルに対し z4親 <30 の取りこぼし0。
- 同フレームでは393,216親について z4ランク = z8子最大ランク 100%。
- 未来予報でも取得できたz8範囲では繰り返し取りこぼし0、親max-rank一致100%。
- ただしこれはJMA公開仕様として保証された契約ではない。反例探索を継続し、z4<30を永久除外ルールへ昇格するのは慎重に行う。

### 透明PNGと404について確定したこと
「雨がない高zoomタイルはファイル自体を作らず404になる」という仮説はCI #526で否定された。
- 近/中/遠の3未来時刻で、z4側が完全透明のz10候補を各100枚、計300枚取得。
- **300/300 HTTP 200**。
- **300/300 中身は完全透明PNG**。
- 雨あり側も300/300 HTTP 200。
したがってJMAは無降水域でも透明PNGを配信する。404の原因は「雨なしだからファイルがない」ではない。

### 404再現調査
CI #529に `scripts/jma-404-reproduction-proof.ts` を追加済み。
- 近未来・中間・60分先のz8を、z4全国6タイル配下の **1,536枚/時刻** で総当たりする。
- 200 / 404 / その他を数える。
- 404の先頭20件は `x / y / 実URL / basetime / validtime` を記録する。
- ステップ `Reproduce live JMA forecast 404s and capture coordinates` は最新確認時点ですでにSUCCESS。
- ただしCI #529全体はまだin_progressで、GitHubの実行中ログBlobが取れず、実URL一覧は未回収。

**新チャット最初の作業:**
1. CI #529の完了を確認。
2. job logから `JMA_404_REPRODUCTION_PROOF` を抜く。
3. 実404 URL・x/y・validtimeを確認。
4. 404座標を地理位置/提供範囲/予報時刻/zoomパターンで分類する。
5. 候補限定ルートでは同座標系が取れるか比較する。
6. 結果をこの総覧とPR #59へ追記する。

### 重要な解釈
404調査は重要だが、アメくる本体の成立条件そのものではなくなっている。候補限定方式ではCI #523で+60分までz10取得に成功しているため、404の正体が完全解明できなくても、

**z4全国スキャン → 30以上候補だけ高zoom取得 → 市区町村判定**

のルートが実装本命。

### まだ残る統合課題
- proofで成立した候補限定高zoom方式を、実際のPreview/application workerへ統合する。
- 実routeはまだ旧 `processNationalRainRefinementJobs()` 系で、新しいdeadline/partition/ownership proofと完全統合されていない。
- 404/NO_DATA/fetch errorはfail-closedを維持。
- Production変更、PR merge、Production deployはオーナー承認まで禁止。

### 運用ルール
- オーナーの「りょ」「進めて」後は、安全なfeature branch作業を調査→実装→commit→CI→診断→修正まで継続してよい。
- 止まるのは Production migration / cron・Vault / Storage破壊変更 / Push接続 / merge / Production deploy 等の高影響操作のみ。
- 「ソラの入れたは実物を見るまで信用するな」。必ずCI/log/実物で確認する。
- 「未来のソラを信用するな」。重要判断は総覧へ残す。

### 直近コミット
- `8b21137` — JMA透明タイル存在結果を総覧へ記録。
- `3d04f5a` — 404再現・URL座標取得proofをCIへ追加。現在PR head。



## 新・最優先チェックポイント — 2026-10-04 18時台（PR #59 / source-of-truth reconciliation）

> **この節は、2026-09-30の「新チャット引き継ぎ用・最優先チェックポイント」より新しく、全国強雨系についてはこちらを優先する。**
>
> **未来のソラを信用するな。実装済み・CIで実証済み・実測仮説・未解決を混ぜない。**

### 現在位置

- Repo: `miyazaki1016/emergencyalert`
- PR: #59 `Add nationwide heavy-rain scan proof`
- Branch: `feat/national-heavy-rain-preview`
- この総覧更新直前のbranch HEAD: `afda5748d8bab95a0cd683321f6432fd76d7e271`
- PRはOPEN / 未merge。
- Production DB migration / cron / Vault / Storage mutation / watch-rain/Push接続 / intentional Production deploy は未実施。
- 全国強雨系は引き続き **Preview/proof**。ユーザー通知のProduction経路には接続しない。
- Atomicity gate: **CLOSED**。
- Throughput/scheduler gate: **OPEN**。
- Production readiness: **NO**。

### JMA公式仕様と、アメくる実測を分離する

気象庁公式情報として、高解像度降水ナウキャストは日本域を対象とし、250m〜1km解像度、5分毎、最大1時間先の解析・予測情報として提供される。

一方、JMA Web PNGタイルのzoom別ファイル存在条件、`targetTimes_N2.json` 掲載と各PNG公開完了の厳密な同期、低zoomの集約演算、404の意味は、EmergencyAlertが公開仕様として保証された契約だと扱ってはならない。

したがって以下を区別する。

- **JMA公式仕様**: 公式資料に明記されたプロダクト意味・時間範囲・解像度等。
- **live evidence**: CI/proofが特定時点の公開PNGで観測した挙動。
- **application contract**: 不完全な公開状態でも安全側に倒すEmergencyAlert側の契約。

404 / fetch error / unpublished tile は引き続き `NO_DATA/unavailable` であり、`NO_RAIN` ではない。

### CI #529以後の404実測 — 古い「透明z10は常に200」を契約化しない

CI #529では、サンプルしたz10についてopaque側・transparent側とも各100/100 HTTP 200となるフレームが観測された。一方、その後のlive proofでは、transparent coarse block由来のz10が100/100 HTTP 404となるフレームも観測された。

また全国z8総当たりでは多数の404が継続して再現している一方、強雨候補から選んだ高zoomタイルは取得できるケースが多い。

結論:

- 「透明だから404」「透明でも必ず200」のどちらも恒久契約にしない。
- 404の一般原因解明を本体開発の前提にしない。
- **必要な候補タイルが取得できるかをその時点で確認し、取得不能は不明のまま扱う。**
- 404を雨なしへ変換しない。

### 現在の全国強雨パイプライン実装

現在のapplication codeは、全国z4粗走査から候補だけを段階的に絞る実装へ進んでいる。

```text
forecast targetTimes
  -> z4 nationwide coarse scan
  -> >=30 mm/h coarse candidates
  -> z6 jobs
  -> z8 jobs
  -> z10 jobs
  -> exact raster footprint
  -> N03 municipality resolution
  -> proof result storage
```

実装箇所:

- `app/api/rain/national-queue/route.ts`
  - 観測z4を走査し、現在すでに強雨のcoarse candidateを除外。
  - 未来予報z4の>=30候補から最初のz6 jobを作る。
- `lib/weather/rain/nationalRainQueue.ts`
  - `NationalRainRefinementStage = 6 | 8 | 10`
  - coarse candidateのworld-pixel rectangleから次段tileを導出。
- `lib/weather/rain/nationalRainWorker.ts`
  - z6成功 -> 強雨candidateからz8をenqueue。
  - z8成功 -> 強雨candidateからz10をenqueue。
  - z10成功 -> footprint + municipalityを保存。
- 中間段階z6/z8ではfinal resultを保存しない。最終z10だけが `national_rain_refinement_results` を保存する。

### 重要: staged refinementは「実装済み」だが、まだ正しさを閉じていない

現在のworkerはz6/z8 jobで取得した **256x256 tile全体** を `scanHeavyRainTile(..., stride=1)` で走査する。

しかし、そのjobを作った親candidateが占めるのはその子tile内の一部分である場合がある。tile全体を走査すると、親candidate footprint外にある>=30 pixelまで拾い、次段へ新しい枝を広げる可能性がある。

これは現在の最重要 correctness defect の一つ。

必要な修正方向:

1. 各jobに「親candidateから継承した許可footprint/window」を持たせる、または同等のboundsを再構成する。
2. z6/z8走査では、その許可範囲内だけをcandidateとして次段へ進める。
3. 同一tileに複数親candidateが入る場合は許可範囲のunionを正確に保持する。
4. 親範囲外の強雨を偶然発見してbranchを拡張しないことをテストする。
5. 最終z10 footprintも、選択されたbranchの意味を越えて拡張しないことを確認する。

したがって現時点では **z4→z6→z8→z10の機構は存在するが、candidate-footprint preservation gateはOPEN**。

### 低zoom pruningは依然として「実測仮説」

これまでのlive proofでは、利用可能な比較範囲で `child >=30 => parent >=30` の反例は見つかっておらず、z4 max-rank相当の挙動が繰り返し観測されている。

ただし、これはJMA公開仕様として保証された不変条件ではない。

したがって:

- `z4 <30 => descendantに>=30は絶対存在しない` を気象庁保証の契約として書かない。
- z6/z8でも同様に、段階pruningの安全性を「証明済み」と扱わない。
- counterexample-seeking proofを継続する。
- 取得不能な中間tileを「30未満」とみなしてpruneしない。

### z8は必須可用性を仮定しない

CI #529以後、全国z8総当たりでは多数の404が実測されている。候補限定z8が取得できるケースは多いが、それを永久保証とはしない。

現workerは現在 z6 -> z8 -> z10 を固定経路としているため、選択されたz8が取得不能ならそのjobはfailureとなり、z10へ進まない。

Production-ready設計では、少なくとも次を決めてproofする必要がある。

- intermediate tile unavailable時にbranchを安全にpending/retryする契約。
- または、親candidate footprintから直接z10へ展開できる安全なfallback。
- fallbackは「404だから雨なし」という解釈を絶対に含めない。

**z8 fallback gate: OPEN.**

### targetTimes掲載 != 必要z4 PNG公開完了

2026-10-04 CI #557では、`targetTimes_N2.json` から得た未来validtimeについて必要z4 tileがHTTP 404となり、旧proofが停止した。

この実物から、application側は次の契約へ変更した。

> **forecast frameは、全国走査に必要な6枚のz4 tileがすべて取得できた時だけusable。**

現在の `app/api/rain/national-queue/route.ts`:
- forecast frameのz4走査が失敗した場合、そのframeを「未準備」としてskipする。
- その失敗をNO_RAINには変換しない。
- 他のusable forecast frameは処理を継続する。
- 観測/current frameの取得失敗は引き続きroute全体をfailさせる。

`scripts/national-forecast-z4-screening-proof.ts` も同じ意味へ変更し、unavailable frame/tileを明示記録してskipする。

ただし **CI #559はRED**。理由は実装ではなく、旧unit testが「後続forecast frameが503ならroute全体503・enqueueゼロ」を期待したままだから。

CI #559:
- National rain proof #263: SUCCESS
- JMA low-zoom max-rank proof #51: SUCCESS
- N03 national prefecture index proof #183: SUCCESS
- All47 ownership proof #57: SUCCESS
- Main CI #559: FAILURE
- test result: 38 files / 190 tests pass, 1 test fail
- failing test: `app/api/rain/national-queue/route.test.ts` 「does not partially enqueue when a later forecast frame fails」
- old expectation: HTTP 503
- new implementation: unavailable later forecast is skipped and HTTP 200

次の修正は単なる `503 -> 200` 書換えではなく、テストで以下を保証する。

1. usable forecast frameのjobsだけenqueueされる。
2. unavailable forecast frame由来jobは1件も混入しない。
3. unavailableをNO_RAIN扱いしていない。
4. current observation coarse fetch failureは引き続きfail-closed。

**CI green gate: OPEN until this contract test is updated and actual CI passes.**

### throughput harnessの保存契約

`scripts/national-rain-throughput-harness.ts` はhard deadlineで全offered jobをclaimしない場合を許容する方向へ更新された。

正しい意味:
- unclaimed jobはqueueにPENDINGとして残り、今回の失敗ではない。
- claimed後にdeadlineで実行しないjobはdeferして戻す。
- z6/z8は中間段階なのでfinal result保存0が正常。
- z10は完了したfinal-stage jobについてresult保存が必要。

ただし現harnessの `expectedSaved` は「入力jobsが全部z10なら `result.done`、それ以外なら0」というhomogeneous batch前提の簡略実装である。mixed-stage batchを測るproofへ拡張する場合は不十分。

**mixed-stage accounting: NOT PROVEN / future fix before relying on mixed-stage throughput evidence.**

### application workerのdeadline安全性は未統合

`lib/weather/rain/nationalRainWorker.ts` は `budgetMs` とclaim前deadline確認を持つが、すでに開始したJMA fetch / municipality resolution / DB save / finish RPCをAbortSignalでdeadline cancelする実装にはなっていない。

`app/api/rain/national-worker/route.ts` も従来の `createSupabaseN03AdministrativeAreaLoader()` + `processNationalRainRefinementJobs()` を使用している。

したがって以前proofで成立した:
- partitioned 32 MiB loader
- region-local ownership/gather
- in-flight AbortSignal cancellation
- explicit final DB-RPC reserve
- queue-aware dispatcher

は、**実application workerへ統合済みとは書かない**。

### 市区町村と町丁目

現在の実装済み行政名解決はN03による市区町村レベル。

ユーザーが求める最終表示例:

> 東京都江東区塩浜付近で、30mm/h以上の強い雨が予想されています

のような町丁目/字レベルは **未実装**。

設計方向:
1. z10で強雨footprintを確定。
2. N03で市区町村を絞る。
3. その市区町村に必要な町丁・字等境界だけをload。
4. exact footprintとintersection。
5. 境界付近や複数候補は「○○付近」等でfalse precisionを避ける。

町丁目dataset/API/licensing/update contractは実装前に公的原典で再確認する。雨の検出ロジックと地名付与は分離する。

### Productionへ進む前の優先順位 — 2026-10-04版

古い「全国z8大量処理を前提にschedulerを先に詰める」順序へ戻らない。

現在の優先順位:

1. CI #559の旧contract testを新しいframe-readiness契約へ更新し、CI greenを取り戻す。
2. staged refinementの **parent candidate footprint外へbranchが広がる問題** を修正。
3. z6/z8 pruningのcounterexample proofを継続し、未証明を未証明のまま扱う。
4. intermediate unavailable時のretry/direct-z10等の安全なfallback契約を決める。
5. liveで本当に z4 -> z6 -> z8 -> z10 が最後まで進むproofを取る。
6. その実コードパスでN03/worker throughput・deadline・memoryを再測定。
7. application workerへbounded partition loader / deadline cancellation / final RPC reserveを統合。
8. 町丁目境界による地名精密化は、全国強雨検出のcorrectnessが固まってから実装する。
9. その後にscheduler cadence / Production migration / Push接続を判断する。

### 現時点の判定

- 全国z4候補抽出: **IMPLEMENTED / empirical safety evidence exists**
- forecast frame readiness: **IMPLEMENTED, CI contract test pending**
- z4 -> z6 -> z8 -> z10 staged queue: **IMPLEMENTED**
- parent candidate footprint preservation: **DEFECT / OPEN**
- low-zoom max-rank invariant: **EMPIRICAL ONLY / NOT A JMA CONTRACT**
- intermediate 404 fallback: **OPEN**
- final z10 municipality result: **IMPLEMENTED in proof worker**
- N03 municipality: **IMPLEMENTED**
- 町丁目/字: **NOT IMPLEMENTED**
- application worker in-flight deadline cancellation: **NOT IMPLEMENTED**
- Production scheduler: **NOT ACCEPTED**
- Push/watch integration: **NOT CONNECTED**
- PR #59 merge: **NO**
- Production readiness: **NO**

> **いまの本丸は「全国を力ずくで読むこと」ではない。z4で見つけた候補の意味を壊さず、必要な高zoomだけを安全に追跡し、取得できないものを“雨なし”に変えないこと。**


## 新・最優先チェックポイント — 2026-10-05（direct z4 -> z10 / CI #588）

> **この節は全国強雨系の最新source-of-truth。2026-10-04節の staged z4 -> z6 -> z8 -> z10 記述よりこちらを優先する。**
>
> **実装済み、CI実証、実測仮説、未解決を混ぜない。**

### 本流は direct z4 -> z10 bounded refinement へ変更済み

新しくenqueueされる全国強雨jobは、z4 coarse candidateから **直接z10** へ進む。
z6/z8は新規本流の必須段階ではない。

```text
forecast targetTimes
  -> usable z4 nationwide coarse scan
  -> >=30 mm/h coarse candidates
  -> direct z10 job + exact 64x64 scanWindow
  -> exact raster footprint
  -> N03 municipality resolution
  -> proof result storage
```

z4 -> z10ではzoom差が6なので、一つのz4 world pixelは64x64 z10 pixelsに対応する。
tile境界が整列するため、その64x64 descendant windowは一つのz10 tile内に収まる。
jobはtile全体ではなく親candidateから継承した `scanWindow` を保持する。

これにより、2026-10-04節でOPENだった「中間tile全体を走査して親candidate footprint外へbranchを広げる」問題は、新規direct-z10本流では回避される。bounded lineage/windowのqueue identityとworker bounded scanはCIで検証済み。

`nationalRainWorker.ts` のz6/z8処理は、既存queue jobとの後方互換のため残っている。**残っていることを本流がstaged refinementである根拠にしない。**

### direct z4 -> z10切替の実物確認

主な実装commit:
- `f147a80cd9863a1321e2617c3fa5fa151e2bb011` — direct z4 -> z10 jobへexact scanWindowを付与。
- `3ee6f09bb2e1bf08e9f5ed22a5e9c2388134d741` — direct bounded mapping regression test。
- `688f93d1a71e89c77bb602f2eb89393cf24a9228` — `/api/rain/national-queue` の新規jobをz10へ直接enqueue。
- `34fc06f1586c9f1f3c2e2a6457a89810322b4935` — route contract testsをdirect z10へ更新。

CI #585で Main CI / National rain / N03 / All47 がSUCCESSし、新規queueがdirect z10へ入る実装を確認した。

### low-zoom proofを永久timeout型からbounded実測へ変更

旧workflowは z4->z6, z6->z8, z8->z10 を順に大規模比較し、特にz8->z10で30分timeoutを繰り返した。
これは「反例を発見した」証拠ではなく、永久CIとして計算量が不適切だった証拠である。

現在は新本流に合わせて **direct z4 -> z10** を検証対象とし、全国z10全走査ではなく決定論的bounded sampleを使う。

主なcommit:
- `f031819499aa5847ede91978fcaf03ae7928ca3d` — workflowの対象をdirect z4 -> z10へ変更。
- `351f7cf8b6e8e00c18b485a9236be3fcb7faa99b` — proof本体をbounded deterministic sample対応。
- `b6d5497b45cb1ec776eb4e6d3928c62309cc67b0` — CI sample数を64に固定。

JMA z4 to z10 screening proof #80 はSUCCESS。
選択したdetail tileのfetch failureはproof failureであり、dryには変換しない。

**重要:** このproofのzero-missは、その観測frame・選択sampleに対する実測証拠である。
`z4 <30 => z10 descendantに>=30は存在しない` をJMA公開仕様・普遍契約として昇格させない。

### 最新CI checkpoint

commit `b6d5497b45cb1ec776eb4e6d3928c62309cc67b0` で実物確認済み:

- Main CI #588 — **SUCCESS**
- JMA z4 to z10 screening proof #80 — **SUCCESS**
- National rain proof #292 — **SUCCESS**
- N03 national prefecture index proof #212 — **SUCCESS**
- All47 ownership proof #86 — **SUCCESS**
- Main CIの `npm test` / queue lifecycle / throughput・stress系 / `npm run build` までSUCCESS。

したがって旧「lowzoom proof timeout中」「CI green gate OPEN」「新規本流はz6/z8必須」という状態は解消済み。

### 404 / missing-data契約は変えない

direct z10化は404を説明したり、404を雨なしへ読み替えたりする変更ではない。

- 必要なz4 frame tileが未準備なら、そのforecast frameはunavailableとして扱う。
- 選択された必要z10 tileを取得できなければfail/incompleteとして扱う。
- `404 != NO_RAIN`
- `FETCH_ERROR != NO_RAIN`
- `NO_DATA != SAFE`

CI #529のz10 100/100取得結果も、全時刻・全座標への恒久保証にはしない。

### 市区町村 / 町丁目

最終z10 footprintからN03市区町村を解決するproof workerは実装済み。
町丁目・字レベル（例: 「東京都江東区塩浜付近」）はまだ未実装。
雨域確定と地名付与は分離し、町丁・字等境界はz10強雨footprint確定後にintersectionする方向を維持する。

### Production gate

direct z4 -> z10への変更とCI greenは、Production rolloutの承認ではない。

- 全国強雨系: **Preview/proof**
- low-zoom screening: **EMPIRICAL ONLY / NOT A JMA CONTRACT**
- direct z4 -> z10 bounded refinement: **IMPLEMENTED / CI VERIFIED**
- parent lineage/window preservation: **CLOSED for the new direct-z10 path**
- z6/z8 worker branches: **BACKWARD COMPATIBILITY**
- N03 municipality: **IMPLEMENTED in proof path**
- 町丁目/字: **NOT IMPLEMENTED**
- Production scheduler/cadence: **NOT ACCEPTED**
- Push/watch integration: **NOT CONNECTED**
- PR #59 merge: **NO**
- Production readiness: **NO**

次の優先作業は、direct-z10のexact bounded scan regressionをさらに固定し、実route/workerのretry・deadline・DB migration source-of-truthを確認する。その後に町丁目精密化へ進む。

> **z8の404を力ずくで解決するのではなく、z4で見つけた候補のexact descendantだけをz10で見る。分からないものは分からないままにする。**


## 新チャット引き継ぎ用・最終チェックポイント — 2026-10-05 13時台

> **次のチャットはこの節から開始する。全国強雨系について、古いcheckpointと衝突する場合はこちらを優先する。**
>
> **第3条：ソラの「入れた」は、実物を見るまで信用するな。**

### 現在位置

- Repo: `miyazaki1016/emergencyalert`
- PR: #59 / Branch: `feat/national-heavy-rain-preview`
- PRは未merge。全国強雨系はPreview/proof。
- Production migration / scheduler / Push・watch_targets接続 / rollout は未承認。
- Production readiness: **NO**。

### 今回閉じた本流

新規全国強雨jobは `usable z4 nationwide scan -> z4 >=30 candidate -> direct z10 tile + exact scanWindow -> bounded z10 scan -> exact footprint -> N03 municipality -> proof result` を本流とする。新規jobはz6/z8を必須経路にしない。workerに残るz6/z8 branchは既存queue jobとの後方互換用。

z4とz10のzoom差は6なので、一つのz4 pixelは64x64 z10 pixelsに対応する。direct jobはexact descendant rectangleを `scan_min_x/y` / `scan_max_x/y` として持ち、workerはその範囲だけを走査する。

### scanWindow漏れ防止を実worker testで固定

commit `b24ac52c33e2529f3abbc8176075d1c53135bbaa` (`Test bounded z10 worker scan window`) で、256x256のz10 test PNGにscanWindow内 `(20,20)` とwindow外 `(200,200)` の両方へ>=30 mm/h pixelを置き、job windowを `0..63 x 0..63` に限定した。

期待値を `strongPixels = 1`、保存結果も `strong_pixel_count = 1` に固定したため、window外を拾えばtestがfailする。Main CI #590の `npm test` で **SUCCESS**。新direct-z10本流の parent lineage/window preservationは実worker経路で **CLOSED** と扱う。

### 最終CI実物確認

commit `b24ac52c33e2529f3abbc8176075d1c53135bbaa`:

- Main CI #590 — **SUCCESS**
- National rain proof #294 — **SUCCESS**
- JMA z4 to z10 screening proof #82 — **SUCCESS**
- N03 national prefecture index proof #214 — **SUCCESS**
- All47 ownership proof #88 — **SUCCESS**
- Main #590は `npm test`、queue/deadline、throughput/stress/cache/replay、queue lifecycle、`npm run build` までSUCCESS。

直前の総覧source-of-truth更新は `c436bf67fb28c4118f9ab677e993954ea197f2f0`。

### 絶対に言い過ぎないこと

direct-z10実装がgreenでも、z4 screening自体をJMA公式保証として証明したわけではない。low-zoom pruningは **EMPIRICAL EVIDENCE ONLY**。selected tile fetch failure / 404はUNKNOWN/unavailableで、NO_RAINではない。`UNKNOWN_PIXEL != NO_RAIN`、`FETCH_ERROR != NO_RAIN`、`NO_DATA != SAFE` を維持する。screening proof #82のzero-counterexampleも実行時点/sampleの証拠であり永久契約ではない。

### 次のチャットで最初にやること

1. branch HEADとPR #59の実物を再確認する。
2. direct-z10本流に対して古いz6/z8必須前提がtest/workflow/docsに残っていないか検索し、実害のあるstale assumptionだけ整理する。
3. proof migrationが過去に編集済みmigrationを上書きする形になっていないか確認し、Production適用済みならforward migrationが必要になる点を整理する。
4. actual application workerのdeadline/retry/DB RPC境界を再確認する。取得不能をdryへ変換しない。
5. 全国強雨検出correctnessを崩さないことを確認後、町丁目・字等境界による地名精密化へ進む。
6. scheduler / Production migration / Push接続 / merge / Production deploy は別ゲートとしてオーナー判断まで行わない。

### 町丁目の次期目標

現在はN03市区町村まで。次の表示目標は「東京都江東区塩浜付近で、30mm/h以上の強い雨が予想されています」のような町丁目レベル。ただし地名付与は雨検出と分離し、z10 strong-rain footprint確定後、公的な町丁・字等境界とintersectionする。境界曖昧時は「付近」等でfalse precisionを避ける。

### 現時点の判定

- 全国z4 coarse scan: **IMPLEMENTED**
- forecast frame readiness: **IMPLEMENTED**
- direct z4 -> z10 bounded queue: **IMPLEMENTED / CI VERIFIED**
- z10 exact scanWindow: **IMPLEMENTED / REGRESSION TEST VERIFIED**
- parent lineage/window preservation on new path: **CLOSED**
- z6/z8 mandatory refinement: **REMOVED FROM NEW MAIN PATH**
- z6/z8 worker code: **BACKWARD COMPATIBILITY**
- z4 pruning universal safety: **NOT PROVEN / NOT A JMA CONTRACT**
- 404 cause: **NOT REQUIRED TO BE SOLVED; fail closed**
- N03 municipality resolution: **IMPLEMENTED in proof path**
- 町丁目/字: **NOT IMPLEMENTED**
- Production scheduler: **NOT ACCEPTED**
- Push/watch integration: **NOT CONNECTED**
- PR #59 merge: **NO**
- Production readiness: **NO**

> **次のソラへ：全国z8総当たりへ戻るな。新本流はz4候補からexact descendantをdirect z10で見る。proofのgreenをJMA公式保証へ昇格させるな。分からないものを雨なしにするな。**


## 最新source-of-truth追記 — 2026-10-05 19時台 / worker deadline gate CLOSED

> **全国強雨workerの時間境界については、この節を上の古い「application worker deadline未統合」記述より優先する。**
>
> **Production rollout承認ではない。PR #59は未merge、Production migration / scheduler / Push接続は未承認のまま。**

### N03 municipality resolverまでwork deadlineを貫通

workerのprocessing用 AbortSignal を、z10 municipality解決からN03 Storage downloadまで通した。

主なcommit:
- `5de66bf5fb59a89fbe81e4dd65eaafab4d4df176` — N03 resolverへAbortSignalを追加。
- `9d1ccc1d4fcdc8327e47ff2cef9c1856f74b8ba1` — prepared N03 Storage downloadへsignalを渡し、download/text/parse/cache境界でabort確認。
- `8257de5961e24157145e958f28e2267b166027a5` — workerからmunicipality resolverへprocessing signalを渡す。
- `2bee0a21f30c8ce72cdc9927edde81a88d3687b9` — route closureからN03 resolverへsignalを中継。
- `85df542860d0763a890a51addb5d9425998707c6` — Storage downloadへのsignal伝播test。
- `8647f984a4780368847bf38b6577cc652ddd8990` — municipality resolution中abort時にresultを保存せずjobをdeferするworker test。
- `5806adcfcdcbc71bf414964c2bdbe6d077f7990e` — routeが同一AbortSignalをN03 resolverへ渡すcontract test。

既存のqueue DB境界も、claim / result save / success finish / failure finish / defer / legacy z6-z8 enqueueまでAbortSignal対応済み。processing signalとfinalization signalは分離し、work deadline後もfinal reserve内でdefer/finalizeできる。成功finalizationやcleanup RPCの応答が曖昧な場合は逆方向のfinishを打たずPROCESSINGを残し、5分stale lease reclaimへ委ねる。

### CI実物確認

HEAD `5806adcfcdcbc71bf414964c2bdbe6d077f7990e` の Main CI #621 attempt 2 は **SUCCESS**。

- `npm test`: SUCCESS
- live/read-only N03・worker計測群: SUCCESS
- queue lifecycle: SUCCESS
- `npm run build`: SUCCESS
- buildでSupabase Storage `.download(path, {}, { signal })` の型も通過

attempt 1はlive N03外部取得の接続timeoutで停止したが、同一HEADをコード変更なしでrerunしたattempt 2は完走した。したがってattempt 1をsignal実装の回帰とは扱わない。

### 同期処理はnon-preemptive。ただし実データ実測でbounded

AbortSignalはnetwork待ちを止められるが、`Blob.text()`後の `JSON.parse()` やgeometry intersectionの同期CPU区間を途中でpreemptするものではない。signal checkはそれらの前後に置き、deadline超過後の成功保存を防ぐ。

CI #621 attempt 2の実測:
- live N03 selected 6 prefectures: 422 administrative areas
- cold: read/parse 約1229ms、intersection 約242ms
- prepared cache: read/parse 約1099ms、intersection 約244ms
- prepared N03 6県合計: 87,201,287 bytes / 約83.16 MiB
- 最大サンプル北海道: 41,606,326 bytes
- fixed intersection benchmark: 700 areas x 450 rain polygons、current median 約6.25ms
- worker budget 45s、route maxDuration 60sでplatform margin 15s

この実測から、現在のprepared N03市区町村解決について同期区間はworker budgetに対して十分小さいと判断する。ただし「任意サイズの将来データでも永久に安全」という保証にはしない。prepared datasetのサイズ・構造が大きく変わる場合は再計測する。

### worker deadline gate判定

- queue DB async boundary: **CI VERIFIED**
- JMA fetch processing deadline: **CI VERIFIED**
- N03 Storage async boundary: **CI VERIFIED**
- municipality resolver signal propagation: **CI VERIFIED**
- deadline中resolver abort -> no result save + defer: **REGRESSION TEST VERIFIED**
- sync parse/intersection: **NON-PREEMPTIVE / MEASURED BOUNDED FOR CURRENT PREPARED DATA**
- overall application worker time-boundary gate: **CLOSED FOR CURRENT PREVIEW/PROOF ARCHITECTURE**
- Production scheduler/cadence: **NOT ACCEPTED**
- PR #59 merge: **NO**
- Production readiness: **NO**

### 次の作業

worker安全ゲートは閉じた。次は町丁目・字等による地名精密化へ進める。ただし実装前に、公的な町丁・字等境界dataset/APIの原典、ライセンス、更新契約、全国カバレッジを確認する。雨検出本体と地名付与は分離し、z10 exact strong-rain footprint確定後に地名境界をintersectionする。境界曖昧時は「付近」でfalse precisionを避ける。

> **未来のソラへ：worker deadline gateは閉じたがProduction gateは閉じていない。PR #59を勝手にmergeするな。Production migration / scheduler / Pushを勝手に接続するな。次は町丁目データの公的原典確認から。**


## 新チャット引き継ぎ用・最新総覧 — 2026-10-05 19時台

> **ここをアメくる全国強雨系の最新開始点とする。上の古いcheckpointと矛盾する場合はこの節を優先する。**
>
> **第3条：ソラの「入れた」は、実物を見るまで信用するな。未来のソラを信用するな。**

### 現在地

- Repo: `miyazaki1016/emergencyalert`
- Branch: `feat/national-heavy-rain-preview`
- PR: #59 — **未merge**
- 最新総覧更新直前commit: `5efddef430b177f04faf70a5567e6a15649f5e51`
- 全国強雨系: **Preview / proof**
- Production readiness: **NO**
- Productionの全国強雨queue migration / proof cron: **未適用**
- Production scheduler / Push / watch接続: **未承認・未接続**

### 確定した本流

`usable z4 nationwide scan -> z4 >=30 candidate -> direct z10 tile + exact scanWindow -> bounded z10 scan -> exact strong-rain footprint -> N03 municipality -> proof result`

新規jobではz6/z8を必須経路にしない。残るz6/z8 worker branchは後方互換用。

direct z4 -> z10のexact descendant window、workerのscanWindow限定走査、parent lineage preservationは実装・回帰test・CIで確認済み。

### fail-closed契約

- required z4 frame tile unavailable -> frame unavailable
- selected required z10 tile unavailable -> fail/incomplete
- `404 != NO_RAIN`
- `FETCH_ERROR != NO_RAIN`
- `UNKNOWN_PIXEL != NO_RAIN`
- `NO_DATA != SAFE`

z4 screeningの安全性は実測証拠であり、JMA公式の普遍契約ではない。proofで反例ゼロでも永久保証へ昇格させない。

### worker安全ゲート

worker budget 45s、route maxDuration 60s、platform margin 15s。

processing AbortSignalはJMA fetchだけでなく、municipality resolver -> prepared N03 Storage downloadまで貫通。queue DB操作もclaim / save / finish / defer / legacy enqueueまで時間境界を持つ。processing signalとfinalization signalは分離する。

成功finishやcleanup RPCが曖昧な場合は逆方向の状態変更を行わずPROCESSINGを残し、stale lease reclaimへ委ねる。

Main CI #621 attempt 2 / HEAD `5806adcfcdcbc71bf414964c2bdbe6d077f7990e`:
- npm test: **SUCCESS**
- N03/worker実測: **SUCCESS**
- queue lifecycle: **SUCCESS**
- npm run build: **SUCCESS**
- failed steps: **なし**

同期JSON parse / geometry intersection自体はpreemptiveではないが、現prepared N03実データで実測しworker budgetに対してboundedと判断済み。将来datasetサイズ・構造が大きく変われば再計測する。

**overall application worker time-boundary gate: CLOSED FOR CURRENT PREVIEW/PROOF ARCHITECTURE.**

### Production実物確認済み事項

Production Supabaseには既存watch/push/diagnostic系migrationは存在するが、全国強雨用 `national_rain_refinement_jobs` / results tableは存在せず、`20260929_create_national_rain_refinement_jobs.sql` と `20260930_create_national_rain_proof_cron.sql` は未適用。

したがって現在この全国強雨proofのためのProduction forward-repair migrationは不要。**未適用migrationを勝手に適用しない。**

### 次の本丸：町丁目・字

現在の地名解決はN03市区町村まで。次の目標は、z10 exact strong-rain footprint確定後に町丁・字等境界をintersectionし、例えば:

> 東京都江東区塩浜付近で、30mm/h以上の強い雨が予想されています

の粒度まで上げること。

実装前ゲート:
1. 公的な町丁・字等境界dataset/APIの原典を確認。
2. ライセンス・利用条件を確認。
3. 全国カバレッジと欠損時契約を確認。
4. 更新頻度・版管理を確認。
5. データ量、分割単位、worker memory/time境界を測る。
6. 雨検出と地名付与を分離する。
7. 境界・複数候補・欠損時はfalse precisionを避け、「付近」または市区町村fallbackを使う。

**町丁目データ未確認のまま実装を始めない。**

### 現時点の判定

- nationwide z4 coarse scan: **IMPLEMENTED**
- forecast frame readiness: **IMPLEMENTED**
- direct z4 -> z10 bounded queue: **IMPLEMENTED / CI VERIFIED**
- exact z10 scanWindow: **IMPLEMENTED / REGRESSION TEST VERIFIED**
- parent lineage/window preservation: **CLOSED**
- z6/z8 mandatory path: **REMOVED**
- z6/z8 legacy branches: **BACKWARD COMPATIBILITY**
- z4 pruning universal safety: **NOT PROVEN / NOT A JMA CONTRACT**
- missing-data behavior: **FAIL CLOSED**
- queue/DB deadline boundary: **CI VERIFIED**
- N03 Storage/resolver deadline boundary: **CI VERIFIED**
- sync N03 parse/intersection: **MEASURED BOUNDED FOR CURRENT DATA**
- application worker safety gate: **CLOSED FOR PREVIEW/PROOF**
- N03 municipality resolution: **IMPLEMENTED**
- town/chome/aza resolution: **NOT IMPLEMENTED**
- Production scheduler: **NOT ACCEPTED**
- Push/watch integration: **NOT CONNECTED**
- PR #59 merge: **NO**
- Production readiness: **NO**

### 次回開始手順

次回はworker deadline調査へ戻らない。最初にbranch/PR/最新CIの実物だけ再確認し、その後 **町丁目・字等の公的データ原典調査**から開始する。

Production migration、scheduler、Push接続、PR #59 merge、Production deployは、町丁目作業とは別ゲート。オーナーの明示承認なしに進めない。

> **次のソラへ：全国z8総当たりへ戻るな。worker deadline gateを再オープンするな（新しい反証が出た場合を除く）。次は町丁目データの原典・ライセンス・全国性を実物確認する。Productionは触るな。**


## 新チャット引き継ぎ用・最新総覧 — 2026-10-07 01時台

> **ここを全国強雨系の最新開始点とする。上の古いcheckpointと矛盾する場合はこの節を優先する。**
>
> **Production rollout承認ではない。PR #59 / Production migration / scheduler / Push / watch接続は引き続き別ゲート。**

### 現在地

- Repo: `miyazaki1016/emergencyalert`
- Branch: `feat/national-heavy-rain-preview`
- PR #59: **OPEN / 未merge**
- この更新直前HEAD: `f43a64d471feaad1af206c383d1db794b95835b3`
- 2026-10-05 19時台総覧commit `7f66086d...` から **30 commits進行**
- Production readiness: **NO**
- Production全国強雨queue / proof cron / scan-cycle migration: **未承認・未適用のまま扱う**

### 町丁目・字 proof の進展

国勢調査系の公的町丁・字等境界を使うproofを追加し、江東区塩浜で実データintersectionを確認した。

確認済み:
- 江東区データ: 約207 KB / 174 geometry
- parse: 約2.60 ms
- heap増分: 約3.6 MB
- 塩浜一丁目 / 二丁目の共有境界では両候補になり得る
- 単一候補なら町丁目名を使える
- 複数候補・境界曖昧時は false precision を避け **「付近」fallback** とする

CI proofはgreen実績あり。ただし、これは地名精密化proofでありProduction接続承認ではない。

### 全国scan cycle / baseTime 契約

全国scanを単純な固定間隔の重複実行にしないため、JMAの完了したbaseTimeを単位にcycle stateを持つproofを追加した。

追加済み:
- national rain baseTime cycle contract + tests
- proof state / persistence migration `20261006_create_national_rain_scan_cycles.sql`
- completed baseTime gating
- older unresolved retryを新しいcycleでsupersedeする契約

狙いは「同じ完成cycleを何度も全国走査しない」「古い未解決retryが新しい情報を邪魔しない」こと。

**このmigrationはbranch上のproof資産であり、Production適用承認ではない。**

### JMA 404 の最新理解

404を雨なし扱いしない原則は維持する。

これまでに確認した重要点:
- z9が404でも、その配下z10が200になる例があるため、zoom親子のavailabilityを単純継承しない。
- dry tile省略説は既存proofで否定的。404原因を「雨がないから」と解釈しない。
- delayed retry proofを追加し、2.5分だけでなく最大10分の回復観測を行う形へ拡張した。
- older unresolved retryは新しいcycleが来た場合にsupersede可能な契約へ進めた。

したがって現契約は引き続き:
`404 != NO_RAIN` / `FETCH_ERROR != NO_RAIN` / `UNKNOWN_PIXEL != NO_RAIN` / `NO_DATA != SAFE`。

### 公的水害データの2026-10-07再確認

今後の水害layerに使う公的sourceについて最新公開状況を再確認した。

- 国土数値情報「洪水浸水想定区域」: **2025年度版が最新**。2026年5月に追加データ公開・更新。
- 国土数値情報「雨水出水（内水）浸水想定区域」: **2025年度版が最新**。2026年5月更新。GeoJSONも提供、CC BY 4.0。
- 国土数値情報「多段階浸水想定」: **2025年度版が最新**。高頻度〜中頻度の降雨規模別浸水想定を扱える。
- ハザードマップポータル: **2026-09-15** に洪水想定区域を多数追加し、内水も3市町村追加。2026-07-13には指定避難所を地理院地図側で確認可能になった。

設計上の扱いは既存のABSOLUTE LIFE-SAFETY RULEを変更しない。これらはSTATIC_HAZARD / official risk-support dataであり、現在の冠水深や現在浸水中という事実へ変換しない。

### 最新CI実物確認

HEAD `f43a64d4...`:
- National rain proof #357: **SUCCESS**
- JMA z4 to z10 screening proof #145: **SUCCESS**
- N03 national prefecture index proof #277: **SUCCESS**
- All47 ownership proof #151: **SUCCESS**
- Main CI #653: **FAILURE**

Main CIの失敗点は `npm run build` のTypeScript error:
`lib/weather/rain/nationalRainQueue.ts:217` で `query.abortSignal` が `unknown` 型として扱われる。

これは現在の最優先コードゲート。proof群がgreenでもbranch HEAD全体はCI-greenではない。

### 現時点の判定

- z4 nationwide screening -> direct z10 exact refinement: **IMPLEMENTED / proof継続**
- z4 pruning universal guarantee: **NOT PROVEN / NOT JMA CONTRACT**
- town/chome/aza boundary proof: **CI VERIFIED / PROOF**
- ambiguous town boundary fallback: **PROVEN / 「付近」**
- municipality N03 resolution: **IMPLEMENTED**
- scan cycle / completed baseTime gating: **IMPLEMENTED ON BRANCH / PROOF**
- delayed 404 retry observation: **IMPLEMENTED / PROOF**
- missing-data behavior: **FAIL CLOSED**
- current HEAD Main CI: **RED — TypeScript build error**
- PR #59 merge: **NO**
- Production scheduler: **NOT ACCEPTED**
- Push/watch integration: **NOT CONNECTED**
- Production readiness: **NO**

### 次の一手

1. まずMain CI #653のTypeScript build errorを修正し、HEADをCI-greenへ戻す。
2. 修正後、cycle/baseTime契約のtestsとbuildを実物確認する。
3. 404 delayed-retry proofの結果を「回復する/しない」の単純断定ではなく、cycle freshnessとsupersede契約へ反映する。
4. 町丁目proofを雨検出本体と分離したまま、resolver契約へ昇格させる条件を整理する。
5. 水害layerは洪水・内水・多段階浸水想定をSTATIC_HAZARDとして取り込み、観測/予測/危険度/静的ハザードを混同しないschemaから進める。

> **未来のソラへ：まず赤いMain CIを直せ。proof greenをbranch greenと取り違えるな。Productionは触るな。404を雨なしにするな。町丁目の境界曖昧時は「付近」。水害ハザードを現在浸水の事実に変換するな。**


### 2026-10-07 実機観測メモ — LT_1 とユーザー向け「雨」表現を分離する

- 羽田空港の実機テストで、現地体感では降雨を感じない状態にもかかわらず「羽田空港の雨、もうすぐ止みそうだよ」と通知された事例を確認した。
- 同時刻帯の外部雨雲表示でも羽田周辺にはごく弱い降水域が点在しており、JMA PNG の地点ピクセルが微弱降水を検出したこと自体は誤りとは限らない。
- 現行実装では `LT_1`（1 mm/h 未満）も `status=RAIN` であり、3回連続の RAIN で `confirmed_weather=RAINING` になり、その後の RAIN_ENDING により「もうすぐ止みそう」が成立し得る。
- 設計上は **観測としての降水検出** と **ユーザーへ「雨が降っている」と表現してよい閾値** を分離する。LT_1 は捨てずに内部データ・診断には保持するが、LT_1 単独を「降っている」「止みそう」の Push 根拠にしない方向で検討する。
- ユーザー向け降雨確定は `1_TO_5` 以上、または LT_1 の時間継続・周辺空間継続などを組み合わせる候補を比較してから決める。単一地点・単一ピクセルだけで閾値を固定しない。
- この日常通知閾値の調整は、全国の **30 mm/h 以上の強雨検出・危険雨スクリーニングとは別レイヤー** とし、強雨側の検出感度を落とさない。
- 今回事例は「データが誤り」と断定せず、**データ上の微弱降水と人間が受け取る自然言語表現の不一致**として扱う。


### 2026-10-07 CI #656 / JMA 404 delayed-retry 確定結果

- Main CI #656 は success。npm test / build / 全国雨関連 proof を含む verify job が完走した。
- 再現した JMA forecast tile 404 から 204 URL を追跡し、同一 URL を **2分30秒 / 5分 / 7分30秒 / 10分** で再取得した。
- 結果は全チェックポイントで **404→200 回復 0/204**。10分後も 204/204 が 404 のままだった。
- この1 run だけから「404 は絶対に回復しない」と一般化しない。CI 自身の limitation の通り、異なる気象・公開状況で反復観測を続ける。
- 運用意味は従来どおり：**404 != NO_RAIN / 404 = NO_DATA（取得不能）**。公開遅延と決め打ちしない。NO_DATA を安全・無降雨へ変換しない。
- 4段階 retry schedule `150000,300000,450000,600000 ms` は実際に完走している。
- 次工程は Production rollout ではなく、Proof で成立している **z4 全国 screening → candidate-only z10 refinement → 地点名化** を Preview 本線へ段階統合すること。既存の fail-closed / cycle freshness / supersede / deadline / ownership 条件を壊さない。


### 2026-10-09 N03分割データ導入再開 — GitHub実物・Supabase実物照合

- 作業起点は2026-10-07 20:34 JSTのコミット `d996cdabe1`（Export N03 partition dataset contract）。N03 bounded resolverとversioned Storage契約は既にライブラリ化済み。
- EmergencyAlert Supabase（project `yqyevipvkdwmhcaxywes`）の `storage.objects` を読み取り専用確認：`national-rain-n03` bucketに従来形式 `20260101/XX.areas.json` が47件。新形式 `20260101/polygon-parts-v1/...` は0件、manifestは0件。**分割実データは未配置**。
- Preview branch `feat/national-heavy-rain-preview` にオフライン専用の `scripts/n03-partition-package.ts` を追加（`b81038eee2`）、都道府県コード正規表現を修正（`42a2b3b11c`）、`scripts/n03-partition-package.test.ts` を追加（`eed2a808ea`）。対象は**パッケージ生成契約とテストのみ**。Supabaseへのupload機能、worker切替、Production反映は未実施。
- パッケージ処理は `partitionAreas` からversioned chunkとmanifestをメモリ上に構築し、32MiB超過・oversized chunk・異なる都道府県のareaを拒否。manifestはchunkのアップロードと照合を完了するまで公開してはいけない。
- 2026-10-09確認時点、HEAD `eed2a808ea` のMain CI / N03 national prefecture index proof / All47 ownership proofは**実行中**。National rain proofとJMA z4→z10 screening proofは**SUCCESS**。補助workflow `n03-administrative-area-proof` と `national-forecast-lowzoom-proof` は**FAILURE（原因未特定）**。Main CI greenとは断定しない。
- 次工程：新規テストとbuildのCI結果を確認→必要なら修正→47都道府県のオフライン分割生成・検証とサイズ計測→専用Preview Storage環境の有無・アクセス境界を確認→**明示的なPreview専用**配置・検証→fail-closed worker接続。共有Storageへの書込や既存47ファイルの上書きを勝手に行わない。
- **Production scheduler / migration / Push / watch / PR #59 merge は引き続き禁止**。404 / FETCH_ERROR / UNKNOWN / NO_DATA を無降雨や安全へ変換しない。町丁目境界は曖昧なら「付近」。静的水害ハザードを現在浸水の事実に変換しない。

> 未来のソラへ：最後のコミット日時だけで完成と誤認するな。Storageに新分割データはまだない。新しいオフラインパッケージはCI確定前。PreviewとProductionのデータ境界を確認するまではアップロード禁止。


### 2026-10-09 調査メモ取り込み — 実災害浸水GeoJSON・避難場所・点群・予測研究（検証待ち）

以下はオーナーが共有した2026-10-02〜10-09の調査要約。**原典URL・GeoJSON実ファイル・公開日時・ライセンス・データ仕様の独立検証は未実施**。検証完了までは外部資料の事実確定や実装済み扱いをしない。

1. **最優先の検証候補：国土地理院の「台風25号・北印旛沼」浸水推定図・GeoJSON。** 共有情報では10月1日16時時点の浸水範囲を10月2日に公開、標高とヘリ画像による推定輪郭。最大浸水範囲ではなく、未着色の浸水・誤着色もあり得るとの注意。まず公式公開元・日付・ダウンロード先・利用条件を確認する。取得できれば、当時のレーダー雨量・標高DEM・既存ハザード区域と重ね、**30mm/h抽出→地形判定→浸水候補**を過去災害で独立Proof検証する。輪郭一致だけでなく見逃し・過剰検出・観測不能域を分け、推定図を完全なground truthと扱わない。30mm/hは強雨候補の閾値であり、浸水の必要十分条件ではない。
2. **指定緊急避難場所と指定避難所を区別。** 国土地理院の全国CSVは共有情報では共通ID・座標・「洪水」「内水氾濫」の別項目を持つ。公式スキーマと更新日を要確認。DB/出力契約は `facility_type`（緊急避難場所/滞在用避難所）、`supported_hazards`（洪水・内水など個別）、`designation_updated_at`、`opening_status`（不明を許容）、`opening_status_source`、`opening_status_checked_at` を分離する。**指定されている ≠ 現在開設中**。最寄り順のみで推薦せず、災害種別の適合とアクセス・安全性を考慮。自治体等の現在開設情報が確認できない限り開設中と表示しない。
3. **国土地理院点群データ。** 共有情報では2026-09-30に知床半島北部沿岸の範囲が追加、密度1㎡あたり4点以上、精度約25cm、LAZ、有償かつ大容量・地域限定。原典・価格・対象範囲は要確認。全国リアルタイムMVPには採用せず、既存DEM＋ハザード情報を優先。重点地域（例：江東区塩浜）の微地形精度向上は**当該地点のデータ入手可能性を確認した上で**別Proof。
4. **雨量・水位・LiDAR/HANDを組み合わせる研究。** 共有情報では2026-08-04公開プレプリントでLSTM水位予測と地形解析を統合。論文名・方法・妥当性は要原典確認。将来案として雨量履歴＋水位/排水状態＋相対標高を検討するが、現時点でMLをProduction導入しない。説明可能なルールベースの候補判定を優先し、学習・評価用データを蓄積。
5. **JMAレーダー取得方式は維持。** 共有された10月2〜7日の資料確認では取得仕様変更の新告知なし。独立確認前の暫定判断として、既存の `z4→z10` 段階絞り込みは変更しない。JMAのz4枝刈りを普遍保証と誤認しない。

**絶対安全ルール：** 雨量だけで浸水を断定しない。静的ハザード・観測雨量・推定浸水・現在の浸水確認・避難場所の指定・避難場所の開設を、それぞれ別の情報種別として保持し表示する。「浸水の可能性が高まっています」など確度に応じた表現とし、未取得・不明を安全に変換しない。災害時の避難経路や施設の安全を保証しない。

**優先順位と作業境界：** N03分割データ生成・Preview検証を先に完了。その後、北印旛沼の公式GeoJSON原典検証→過去災害の再現Proof→避難場所スキーマ設計→限定地域の高精度DEM/点群検証。すべて独立Proofから開始し、Production/Push/watch/既存通知には接続しない。

> 未来のソラへ：この章は**ユーザー共有の調査要約の保存**であり、公式資料の真偽確認完了ではない。まず原典を確認。推定浸水図を正解データと断定するな。指定避難場所を開設中と表示するな。30mm/hを浸水の絶対条件にするな。


### 2026-10-09 N03分割データ47都道府県ローカル生成CLI追加

- HEAD `acbeb6e2` のMain CI、National rain proof、N03 index proof、All47 ownership proof、JMA z4→z10 proofはGitHub Actionsで**SUCCESS**確認。補助workflow `national-forecast-lowzoom-proof.yml` と `n03-administrative-area-proof.yml` は引き続き**FAILURE**、原因未確認。
- `scripts/n03-package-all-local.ts` を追加（コミット `b70c4da7`）。入力は既存の47件の `XX.areas.json` が格納されたローカルディレクトリ、出力は**存在しない別ディレクトリ**。47件すべてを事前検証し、`packageN03Prefecture` によるversioned chunksとmanifestをローカル生成する。既存の入力・出力は上書きしない。Supabaseへ接続せず、アップロードも行わない。
- 実行形式：`npx tsx scripts/n03-package-all-local.ts <input-dir> <empty-output-dir>`。**実データでの実行・47都道府県の生成・出力内容の照合は未実施**。このコミットのCIも未確認。実データの取得元・入力の準備が次の阻害点。
- 次：CIで新CLIの型検証→Preview専用の入力取得経路とStorage分離を確認→47都道府県をローカル生成してサイズ・manifest/chunkハッシュを再照合→Previewだけに明示的な段階配置。manifest公開はchunk配置と検証の後。Production、Push、watch、PR mergeは対象外。

> 未来のソラへ：ローカル生成CLIを追加しただけで47都道府県の変換が完了したとは書くな。Storageへの書き込みは禁止のまま。


### 2026-10-09 N03 47都道府県ローカル変換の回帰テスト追加

- `scripts/n03-package-all-local.test.ts` を追加（`ac5cfe61`）。47都道府県の**合成fixture**からmanifest/chunkをローカル生成するテスト、元ファイル非破壊・出力先再利用拒否、47番欠損と都道府県名不一致時に**出力ディレクトリ作成前に停止**するテストを追加。
- **注意：合成fixtureテストは実N03データの全47変換・性能・精度の証明ではない**。実データの入力取得、実サイズ/ハッシュ検証、Preview専用Storageの境界確認は未完了。
- 直前HEAD `e759c1cc` のMain CIは確認時点で実行中。新テストのCI結果は未確定。N03 index / National rain / z4→z10 proofは成功、補助workflow2件は失敗継続。Production変更なし。


### 2026-10-09 N03ローカル分割の書込後照合強化

- `scripts/n03-package-all-local.ts` の各chunkについて、ローカル書込後に再読込しSHA-256を計算して、書込前bodyのSHA-256と一致するか照合する処理を追加（`e8a7896b`）。不一致なら例外停止。manifestは当該都道府県のchunk照合完了後にのみ出力。結果に `verifiedBytes` を追加。
- **これはローカルディスク書込の一致確認**であり、Supabase Storageへのアップロード後照合やmanifest/chunkの全国実データ検証ではない。47都道府県の実ファイルは未取得・未変換。
- 直前HEAD `3746e6a9` のMain CIは確認時点で実行中。今回の変更のCIは未確認。Production/Push/watchは未変更。


### 2026-10-09 N03分割ローカル検証 — manifest/chunkハッシュのテスト拡充

- `scripts/n03-package-all-local.test.ts` を強化（`43011657`）。47都道府県の合成fixture出力で `verifiedBytes>0` を確認し、東京都のmanifest内indexのSHA-256と `indexSha256` の一致、chunkファイルのSHA-256・byte数とindex宣言値の一致を確認する。
- **テスト追加コミットのCI結果はまだ未確定**。合成データでの検証であり、実N03全国47件の出力確認ではない。
- 残課題は47件の既存preparedデータを安全に読み取り専用で取得する手段、実データでのオフライン変換、全chunk照合、Preview Storage分離と配置順序の証明。Productionへの書込は行わない。


### 2026-10-09 N03 47都道府県ローカル変換のメモリ境界修正

- 全47都道府県の `packageN03Prefecture` 結果を同時保持していた実装を見直し、**事前検査→都道府県単位の読込・分割・書込・照合**に変更（`7f12623b`、`0bf9a248`、正規表現修正 `0dcbd6ae`）。一度に全47都道府県の分割オブジェクトをメモリ保持しない。
- 事前検査は全47ファイルの存在、JSON配列、都道府県名、5桁コードの都道府県一致、Polygon/MultiPolygon型を確認し、**不備があれば出力ディレクトリ作成前に停止**。事前検査と変換でファイルを2回読むトレードオフがある。入力ファイルを処理中に変更しないことを前提とし、入力のスナップショット整合性・原子的な全国一括公開は別途要検証。
- 各都道府県のchunkは書込後にSHA-256再読込照合、manifestは当該chunkの検証後に書込。ただし途中で失敗した場合は出力ディレクトリに**部分成果物が残る**ため、その出力を公開・アップロードしてはいけない。再実行は新しい空ディレクトリで行う。
- **実データ変換未実施、変更後のCI未確認**。共有Supabase Storageの読み取り経路とPreview分離の確認が未完了。Production/Push/watchは未変更。


### 2026-10-09 N03入力スナップショットのSHA-256固定

- `scripts/n03-package-all-local.ts` に事前検査時の各都道府県入力SHA-256記録を追加（`92f76f22`）。変換直前にファイルを再読込して同じSHA-256であることを確認し、事前検査後に入力が変更された場合は例外停止する。
- 入力全47件のgeometryをメモリ保持せず、保持するのは47個のハッシュ。途中で失敗した際の部分出力は**公開禁止**。変換中のファイル改変が読み取り間に発生する競合を完全に防ぐものではなく、必要なら不変の入力スナップショットから実行する。
- **実N03データの取得・変換・性能計測は未実施**。変更後のCI結果は未確定。GitHub Actionsに多数の実行待ちがあり、補助workflow2件の失敗も継続。CI成功と断定しない。Production/Push/watch変更なし。


### 2026-10-09 実データ変換の可否を最優先 — All47実物CI Proof

- Supabase既存Storageに47件あることと個別サイズを読み取り専用で確認したが、connector経由でファイル本文を安全に取得する経路はまだない。Supabase Storageからの取得・アップロードは行わない。
- 既存 `scripts/prepare-n03-storage-data.ts` は国土数値情報の公式N03都道府県別アーカイブを取得してprepared `XX.areas.json` を生成できる。この既存生成器を使う**独立した実物変換CI** `.github/workflows/n03-all47-real-conversion-proof.yml` を追加（`6925a2f9`）。
- このProofはGitHub Actions上で公式N03全47件を取得→prepared形式に変換→`n03-package-all-local.ts` で全47件を分割→chunk SHA-256 readback→manifest件数/bytesを確認。経過時間・最大RSSを `/usr/bin/time -v` で計測し、**ログだけ**artifactとして保存する。地理データ本体はartifactに含めず、Supabaseには接続しない。
- **重要：ワークフロー追加と実データ変換成功は別。2026-10-09追記時点では新Proofの実行完了を確認していない。** GitHub Actionsの結果がsuccessなら「公式N03アーカイブ→全47分割」の可否が実証できるが、既存Supabase47オブジェクトとのバイト単位同一性やPreview Storage適用はまだ別検証。
- 失敗時は取得・変換・ハッシュ・時間/メモリのどこで失敗したかをログで切り分ける。Production/Push/watch/PR mergeは変更しない。


### 2026-10-09 実物変換CIの初回失敗の切り分け

- 新Proof初回 `6925a2f9` の GitHub Actions run `37882648061` は **failure**。job `113665578474` のログで `npm ci` が `EUSAGE`（リポジトリにpackage-lock.json/npm-shrinkwrap.jsonがない）で停止したことを確認。**公式N03ダウンロード・分割変換ステップはともに skipped** であり、変換不能という結論は出せない。
- 既存CIと同じ `npm install` に変更（`c5910e71`）。この修正後の新Proofの完走・性能・分割サイズは**未確認**。
- 実用性の評価にはファイルサイズの分布（最大、平均、p95）、都道府県ごとのchunk数・総容量増分、実際の空間選択で取得するchunk数/bytes、HTTP遅延、45秒以内のワーカー処理、完全一致判定が必要。**変換成功だけでは採用判定しない**。


### 2026-10-09 実N03変換の最初の本質的失敗（方式採用を保留）

- 実物変換CI run `37882847453`（`c5910e71`）のjob `113666215731` を確認。**npm install 成功、公式N03の47都道府県の取得とprepared化も成功**。次の47件分割変換は **failure**。
- 直接の例外は `scripts/n03-partition-package.ts:20` の `Oversized N03 partition: refusing to package`。現在の `partitionAreas(..., 1MiB)` が `oversized` フラグまたは32MiB上限に抵触するchunkを生成した。これは初回のnpm ci失敗とは異なり、**実データを用いた変換処理で確認された実際の不適合**。
- このログだけでは該当都道府県・chunk・超過bytesを特定できない。未計測のファイルサイズ分布、総容量、45秒ワーカー実用性、正確性について成功を主張しない。
- **現行方式は採用保留**。次は超過chunkの都道府県・サイズ・ポリゴン数・単独巨大ポリゴンかどうかをread-onlyローカル診断で特定する。上限チェックの削除や巨大chunkの黙認はしない。修正案を比較して再試験する。
- 後続run `37882865406` は確認時点でin_progress。Production/Supabase Storage/Push/PR merge変更なし。


### 2026-10-09 北海道の単独巨大ポリゴンを実測特定

- GitHub Actions run `37883472529`（commit `21903afc`）のjob `113668157458` で、47都道府県の公式N03準備は成功、分割変換は北海道（code 01）で停止。
- 診断ログ: `oversizedCount=1`, `totalChunks=46`, `chunk-0041.json`, `bytes=1328374`, `targetBytes=1048576`, `partCount=1`, `areaCodes=[\"01698\"]`, `singlePolygon=true`。
- **根本原因:** 現行 `partitionAreas` はポリゴン単位でchunkを詰めるが、単独ポリゴンが1MiBを超える場合は分割不能。上限の撤廃ではなく、同一ポリゴンの正確な分割（境界上の交点・穴・MultiPolygon等）と元データとの一致検証を設計する。
- 北海道で停止したため残り46都府県の可否は未確認。分割後の実際の読み込み量・45秒以内の性能も未確認。採用・本番適用は保留。


### 2026-10-09 北海道z8方式の実測準備（採用前のベースライン）

- `scripts/n03-hokkaido-z8-feasibility.ts`（`e7338e36`）を追加。公式N03から生成した北海道 `01.areas.json` を**読み取り専用**で分析する。z8タイル別に、ポリゴンbboxが重なる場合に**ポリゴンを丸ごと複製した場合の上限寄りの容量**、中央値/p95/最大サイズ、1MiB超タイル数、複製率、巨大ポリゴンを算出する。
- GitHub Actionsの全国実変換Proofにこの計測を**変換ステップより前**に追加（`7ed48237`）。現行のポリゴン分割が失敗してもz8分析ログを保存する。
- **重要:** bboxベースの全体複製はz8タイル境界での正確なクリッピングではない。境界精度、雨域との完全一致、HTTP取得量、45秒worker適合は未検証。測定値が出るまではz8採用を決めない。Production/Supabase変更なし。


### 2026-10-09 北海道z8 bbox重複方式・実データ計測結果

- GitHub Actions run `37885803676`（commit `c144f025`）のログを確認。公式N03全国47件の前処理は成功し、北海道z8容量計測ステップも**成功**した。
- 北海道194市区町村、Polygon 9,556個。z8 bbox重複方式では24タイル、参照9,688件。元のポリゴン座標JSON 41,573,339 bytesに対しタイル側の重複合計73,725,499 bytes（**1.773倍**）。
- タイルあたり容量：中央値2,109,921 bytes、p95 6,632,547 bytes、最大8,564,449 bytes。**24タイル中22タイルが1MiB超**。最大ポリゴンはcode `01698`、1,328,282 bytesで4タイルのbboxに重なる。
- 従来のPolygon単位1MiB分割は北海道の `01698` の単体1,328,374 bytes chunkで再び失敗。全47変換成功の証明は未達。
- **設計判断：z8 bbox重複・丸ごと保存を1MiBチャンク解決策としては採用しない。** これは実際のクリッピングではなく、z8自体の不適合を証明するものではない。次の候補は正しい幾何クリッピング＋タイル内追加分割（または既存Polygon分割の可変目標サイズ）を比較し、元N03との市区町村完全一致・容量・IO・時間を検証する。未検証の方式をProductionへ移行しない。


### 2026-10-09 z8/z9/z10比較の追加（実測待ち）

- `918ac8f6`: 北海道の公式N03前処理ファイルから、同一条件でz8/z9/z10のbbox重複配置の容量・タイル数・p95・最大・1MiB超数を出すように拡張。CIの既存計測ステップで3行のJSONを出力する。
- **これは3ズームのクリッピング実装ではない。** bboxで元Polygon全体を複製する容量試算であり、正確なクリッピング後のファイルサイズ・行政判定一致率・通信時間は未測定。結果を見ずにz10を採用しない。Production、Storage、PR mergeは変更なし。


### 2026-10-09 z8/z9/z10北海道・実測結果（run 37886267590）

- GitHub Actionsで公式N03北海道194市区町村・9,556 Polygonを用いた3ズームの**bbox全体複製**計測が成功。
- z8：24タイル、合計73,725,499 bytes（元の1.77倍）、中央値2,109,921 bytes、最大8,564,449 bytes、1MiB超22タイル。
- z9：66タイル、合計106,439,939 bytes（2.56倍）、中央値1,449,817 bytes、最大3,912,404 bytes、1MiB超49タイル。
- z10：208タイル、合計199,732,951 bytes（4.80倍）、中央値973,290 bytes、最大2,240,781 bytes、1MiB超93タイル。
- **結論：z10へ細分化するだけでは解決しない。** 個別タイルの最大サイズは下がるが、複製量とファイル数は増え、1MiB超も残る。今回の比較は実際の幾何クリッピングではないため、z8/z9/z10クリッピング方式の優劣は未確定。
- 既存の全47変換は北海道code 01698の単体1,328,374 bytes（目標1MiB）で引き続き失敗。次は、正確なクリッピングを含む方式と既存方式の可変容量・サブチャンクを、判定一致率/IO/時間で比較。Production/Storage変更なし。


### 2026-10-09 別案の実験を追加（実測待ち）

- `scripts/n03-hokkaido-target-comparison.ts`（`d4d5f228`）を追加。公式N03北海道194市区町村について、現行Polygon単位のpackを目標1/1.5/2/4MiBで比較。chunk数、最大容量、超過数、総量、index量、8雨域で元データとの市区町村コード順序完全一致、局所IO量と処理時間を計測する。
- Workflow `3bc563dc` で従来の全国変換（1MiBで失敗が既知）の**前**に実行、JSONログを保存。実測未確認のため成功とは扱わない。
- これは**z8/z9/z10の正確なクリッピングの実装ではない**。その設計と境界一致の証明は未着手。可変目標サイズの実験結果はProduction採用を意味しない。Production/Storage/PR mergeの変更なし。


### 2026-10-09 北海道pack容量比較・実測確定（Actions run 37886638926）

- 公式北海道N03・8固定矩形の比較ステップは成功、元N03との市区町村コード配列は全4条件で8/8一致。**これは限定8ケースであり網羅的な正しさの証明ではない**。
- 1MiB：46 chunks、最大1,328,374 bytes、超過1、総42,440,260 bytes。
- 1.5MiB：30 chunks、最大1,572,781 bytes、超過0、総42,440,244 bytes。
- 2MiB：22 chunks、最大2,096,712 bytes、超過0、総42,440,236 bytes。
- 4MiB：11 chunks、最大4,194,058 bytes、超過0、総42,440,225 bytes。
- 局所矩形の読み込み量は大きなchunkで増える傾向。例query0：1MiB 5,972,022 bytes、1.5MiB 8,869,436、2MiB 11,960,688、4MiB 16,265,187。ローカル実行時間はHTTP/worker時間ではない。
- 現行の全47変換は目標1MiB固定なので北海道code01698単一Polygon超過で引き続き失敗。**1.5MiBへの変更はまだ採用しない**。全国全件での上限/一致検証、Storage読込/45秒worker測定、正確なクリッピング比較を行ってから決定。Production/Storage/merge変更なし。


### 2026-10-09 全国47の1.5MiBローカル検証へ（結果未確認）

- `a760e5a8` でオフライン変換スクリプトに明示的な実験用targetMiB引数を追加。既定1MiBは維持し、1/1.5/2/4MiB以外を拒否。
- `261a364a` でCIの全47変換ステップのみ1.5MiB指定に変更。47都道府県の入力SHA事前固定、全chunkのローカル読戻しSHA照合、manifest後書き、Storage非接続は維持。
- **CI実測はまだ未確認。** 全47成功、精度保証、HTTP/worker 45秒以内、本番採用とはみなさない。Production/Storage/PR merge変更なし。


### 2026-10-09 全国1.5MiB CI阻害の修正

- run 37887122723 は失敗。ログに `n03-package-all-local.ts /tmp/n03-real-prepared /tmp/n03-real-partitions` とあり、**1.5引数が欠落**していた。従って既定1MiBで実行され、北海道code01698の単一Polygon 1,328,374 bytesで従来通り停止。全国1.5MiB方式の失敗を意味しない。
- `dc3dbd90` でworkflowコマンドへ明示的に `1.5` を追加。次のCI実行で実コマンドと47件結果を必ず再確認する。Production/Storage/merge変更なし。


### 2026-10-09 全国1.5MiB検証・岩手県で阻害（run 37887740341）

- 修正後CIは実際に `n03-package-all-local.ts ... 1.5` で実行されたが、全国変換は**失敗**。北海道を通過し岩手県（03）で単一Polygon超過3件：03203=4,333,892 bytes、03211=2,593,220 bytes、03202=3,026,048 bytes（target 1,572,864 bytes）。
- **北海道で成立した1.5MiBを全国へそのまま適用する案は不成立。** 目標サイズを増やすだけでは全国の巨大Polygonに対応できない。各単体Polygonの幾何学的切断、もしくは正しさを保持する別の部分分割を要する。
- 今回のCIでは全国47都道府県の完走、全県の最大Polygon、判定一致率、HTTP/worker性能は未測定。Production/Storage/merge変更なし。

### 2026-10-09 全国巨大Polygon棚卸し追加（実測待ち）

- `0b7d6988`: 47都道府県すべての単体Polygonの最大容量上位3件、1/1.5/2/4MiB超件数を公式前処理データから棚卸しするオフラインスクリプトを追加。単体JSONの概算サイズであり実際のパックサイズとは数バイト程度の差があり得る。
- `d9ce43cf`: 既知の岩手県パッケージング失敗より**前**に棚卸しをCI実行し、小さいJSONログのみ保存。全国にどの程度巨大Polygonが分布するか把握してから切断方式を設計する。
- 実測結果未確認。正確な切断・境界一致率・HTTP/worker性能は未検証。Production/Storage/merge変更なし。


### 2026-10-09 全国巨大Polygon棚卸し実測（Actions 37888596744）

- 公式N03全47都道府県の棚卸しステップ成功。単体Polygon総数125,130。
- 単体Polygonの閾値超過：1MiB超34件、1.5MiB超19件、2MiB超12件、4MiB超1件。最大は岩手県code03203、約4,333,889 bytes（単体JSON概算）。
- **設計上の含意**：1.5MiB案を成立させるには少なくとも19件の巨大Polygonを扱う別機構が必要。通常のPolygon約125千件を一律細分化する必要性は、この数字だけでは示されない。巨大Polygon限定の正確な分割と、未分割部分の保持を比較する。
- CI全体は既知の岩手県1.5MiB容量超過で失敗。幾何切断後の面積・穴・境界接触・元判定との一致は未検証。Production/Storage/merge変更なし。

### 2026-10-09 巨大Polygon限定の実幾何クリッピング試験追加（実測待ち）

- `c7ffa126`：Python Shapely 2.1.2を用いるオフライン試験を追加。公式N03全国47の単体1.5MiB超Polygonを抽出し、各bboxを2/4/8/16/32分割して矩形との**実際の幾何intersection**を計算。切断片の最大JSON容量を計測し、切断片unionと元Polygonの対称差面積を検証する。
- `fbc19521`：全国棚卸し後、従来のパック処理前にCI実行。ログは集計のみ、形状はアップロードしない。結果はまだ未確認。
- 重要：面積一致はJSの市区町村ヒット判定の完全一致を意味しない。新たに生じる切断境界への接触、穴、無効geometry、座標誤差を別途検証する。切断片を本番フォーマットへ組み込む変更は未実施。Production/Storage/merge変更なし。

### 2026-10-09 実幾何切断オフライン検証結果（Actions 37901481708）

- 全国47の単体1.5MiB超Polygon **19/19件**について、Shapely矩形intersectionによる実幾何クリッピングが成功。各切断片のJSON概算最大サイズは1,572,864 bytes未満。元形状と切断片unionの対称差面積は約2.9e-19〜1.66e-17（経緯度座標単位の面積）。
- 最大の岩手03203（元約4.33MB）は4×4格子・25断片に分割、最大断片722,643 bytes。石川17205は最大1,546,127 bytesで閾値に近く、パック形式の追加オーバーヘッド検証が必要。
- **CI全体は失敗**：後続の既存1.5MiBパッケージングが岩手03で容量超過。切断片をパッケージへ統合する実装はまだ存在しない。切断試験ステップのみ成功。
- 未検証：雨域境界接触と穴を含む元JS市区町村判定の一致、分割片ID/索引/読み込み順、47都道府県パックの成功、worker性能。オフライン実験であり採用・Production/Storage/merge変更なし。

### 2026-10-09 19巨大Polygon切断→全国47ローカルパッケージ結合実験（CI未確認）

- `21c63aca`: 19件のShapely切断片を**元の自治体コードと元のpolygon順序の位置に展開**して、実験専用の47都道府県JSONに書き出す任意モードを追加。元の公式前処理データは保持。
- `4e2aa295`: CIで実験用JSONを入力に全国47都道府県を1.5MiBでパッケージングし、既存のchunk SHA/readback検証へ接続。Storage書込なし。実行結果はまだ未確認。
- **重要な未解決点**：切断前後の雨域→自治体一致テスト未実施。Shapely座標変換・穴・境界接触、パックのID/索引と実行時間を実測してから採否判断。CI成功前に全国対応完了とは扱わない。

### 2026-10-09 全国47切断パッケージ結合CI成功（Actions 37902979155）

- **GitHub Actions全ステップ成功**。公式N03 47都道府県を準備→19巨大Polygonを実幾何切断→実験用データを全国47都道府県パッケージ化→chunk SHA/readback照合まで完走。
- 実測：47 prefectures、47 manifests、351 chunks、verifiedBytes **472,804,611**、targetBytes **1,572,864**。元の公式前処理JSON合計461,844,361 bytesとは異なる計数（元JSON総量とパッケージ検証読込量）なので単純な増分比較は不可。
- **重要：これで市区町村判定の正確性が証明されたわけではない**。元公式データと切断後の雨域ヒット判定の一致・穴・切断境界接触・性能は未検証。Production/Storage/merge変更なし。実験版のみ。
