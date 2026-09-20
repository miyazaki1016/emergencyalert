# EmergencyAlert Decision Log

## 2026-09 — source of truth

EmergencyAlert does not independently forecast weather. Official/authorized
forecast, observation and disaster information is the source of truth.

## Rain notification v1

The initial lifestyle notification candidate is forecast rain intensity class
5 mm/h or greater within 30 minutes.

This is NOT a meteorological danger threshold. It is a configurable product
threshold intended to answer whether a person may want to act now (for example,
bringing laundry inside).

Rain below 5 mm/h may be shown in the app but does not normally trigger a push.

## Ending rain v1

Do not infer an ending from one zero frame. Require three consecutive valid
NO_RAIN frames (15 minutes at the normal 5-minute cadence). A missing,
unavailable or unknown frame breaks the run.

## Missing data

Never map NO_DATA, OUT_OF_COVERAGE, FETCH_ERROR or UNKNOWN_PIXEL to NO_RAIN.
Never interpolate a missing official frame.

## JMA PNG palette

The historical 2023 RGB palette is not treated as authoritative for 2026.
The current JMA documentation confirms the precipitation intensity product and
its thresholds, but the application must not silently assume an unverified
rendering palette. Until the palette is verified for the current tile product,
opaque unrecognised pixels remain UNKNOWN_PIXEL.

Future Sora: do not "fix" this by copying the 2023 colors without verification.


## Voice and urgency — product constitution

EmergencyAlert speaks in two clearly separated modes.

### Everyday / lifestyle information

Use ordinary, family-like language. Do not sound bureaucratic or technical.
The user should understand the situation at a glance.

Principle:

> かしこまらない。難しくしない。見た瞬間わかる。

Examples of the intended tone:

- 「もうすぐ雨くるよ」
- 「洗濯物いれとこ」
- 「もうすぐやみそう」

Technical evidence, thresholds and source details remain available underneath,
but the main UI translates them into everyday action language.

### Life-safety information

When an official source indicates an urgent threat to life or physical safety,
the voice changes deliberately: short, strong, direct and action-oriented.
Do not soften an urgent official warning into the casual lifestyle voice.

Principle:

> 普段は、家族が声をかけるように。
> 命に関わるときは、ためらわず強く。

Examples include official emergency earthquake warnings, extreme heat alerts,
special warnings, evacuation information, and other authoritative emergency
information. Exact wording and escalation rules must be grounded in the
official source and its defined severity; EmergencyAlert must not invent or
independently upgrade a danger level.

### Voice escalation boundary

The system does not choose an emergency tone merely because its own logic
"feels" that conditions are dangerous. Emergency voice escalation must be
triggered by an authoritative official alert/severity signal that the
integration explicitly understands.

Future Sora: never let a life-safety alert say something merely cute or casual
because the everyday rain UI uses that tone. Conversely, do not make ordinary
lifestyle notices frightening just to attract attention.


## Project continuity — rule zero

This rule applies across the owner's projects, not only EmergencyAlert.

> 第0条：未来のソラを信用するな。
> 第1条：決めたことより「なぜ決めたか」を残せ。
> 第2条：思想は継承する。実装は検証する。

This is not a joke-only convention. Future sessions and future implementations
must be able to recover the product intent without guessing. Record important
decisions together with their rationale, constraints, rejected shortcuts and
safety boundaries. Do not reinterpret a documented product philosophy merely
because a different implementation looks newer or more elegant.


## Trust is accumulated before an emergency

EmergencyAlert must earn trust during ordinary, low-stakes use before asking the
user to act during a life-safety event.

Trust is built by being consistently transparent about:

- when the information was checked;
- which location is being evaluated and, where useful, its location accuracy;
- uncertainty, missing data and unsupported interpretation;
- the difference between "no rain" and "we could not confirm it".

Principle:

> 普段から正直だから、緊急時の強い言葉が届く。

Do not optimize ordinary notifications for fear, urgency or engagement.
Everyday notices should be calm and proportionate. When the system cannot
confirm something, it should say so plainly instead of manufacturing certainty.

The product should therefore treat each ordinary notification as both useful
information and a small deposit of trust. That accumulated trust is what gives
an authoritative emergency message weight when a genuine official life-safety
alert arrives.

Future Sora: never trade this accumulated trust for a more dramatic message,
a prettier success state, or a higher notification rate.


## JMA PNG palette changes — detect automatically, promote manually

Current public-PNG interpretation depends on verified RGB-to-intensity associations, so a JMA presentation change can affect classification even when the precipitation intensity bands themselves remain stable.

Policy:

> 変更は自動で見つける。意味は勝手に決めない。

EmergencyAlert may automatically observe and compare the current JMA legend against the verified production palette. A difference becomes CHANGE_DETECTED and should eventually trigger operational review/alerting.

A detected RGB must **never** be promoted automatically into the production palette. Promotion requires independent evidence that associates the new RGB with the official intensity band. Until then, unverified opaque pixels remain UNKNOWN_PIXEL; they must not become NO_RAIN or another guessed class.

The palette watcher is therefore a detector, not an updater. This preserves the project rule that uncertainty must not be converted into safety.

Long term, an authorized numeric precipitation feed should reduce or remove this presentation-color dependency. The zero-fixed-cost phase continues to use public PNG imagery conservatively.


## Observation freshness is part of truthfulness

A fresh API response must not make stale meteorological evidence look fresh.

For the rain v1 public-imagery path, the interpretation engine currently withholds user-facing claims when the latest observation is more than 15 minutes old (or implausibly more than 5 minutes in the future). JMA high-resolution precipitation nowcast updates on a 5-minute cadence; the 15-minute limit is an operational tolerance, not a meteorological threshold.

This guard is intentionally conservative and may be revised when provider behavior is better characterized. If revised, keep the reason and tests with the change.

> **確認時刻が新しくても、元データが古ければ「最新」として語らない。**


## Do not force symmetry across JMA observation and forecast metadata

Observation and forecast metadata are different products. A validation rule that is valid for forecast frames must not be copied to observation frames merely because the fields have similar names.

In particular, the rain v1 engine validates the shape of both `baseTime` and `validTime`, but it does not impose the forecast-only `baseTime <= validTime` ordering rule on observation frames without provider-specific evidence.

> **同じ名前の項目でも、同じ意味とは決めつけない。**
