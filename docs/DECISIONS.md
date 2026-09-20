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
