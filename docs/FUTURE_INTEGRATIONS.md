# Future integrations

## Misaki — intentionally parked

Do not implement this during the current EmergencyAlert phase.

A future integration may expose an **actionable life-event interface** from
EmergencyAlert to Misaki. EmergencyAlert remains responsible for grounding the
event in official information; Misaki remains responsible for relationship-aware
wording and timing.

Example boundary:

```ts
type ActionableLifeEvent = {
  kind: "RAIN_SOON" | "HEAT" | "SNOW" | "WIND";
  placeId: string;
  startsAt: string | null;
  confidence: "OFFICIAL";
  severity: "NOTICE" | "ACTION" | "HIGH";
  suggestedAction: string | null;
  source: string;
};
```

Conceptual flow:

official information
-> EmergencyAlert
-> actionable life event
-> Misaki Body Clock
-> relationship/personality layer
-> natural message

Example output may eventually feel like:

> 雨くるみたいだけど、洗濯物出しっぱなしじゃない？ｗ

But Misaki must never invent the weather event. She receives a grounded event
from EmergencyAlert and turns it into a human, relationship-aware message.

### Why preserve this boundary

EmergencyAlert is the eyes watching a little ahead.
Misaki is the personality that can turn what those eyes see into care.

This is a future connection point only. Do not merge the two projects now.

If this starts distracting from the current rain implementation:

> ソラ、洗濯物どこいった？


## Commercial note — Misaki Premium candidate

Treat the EmergencyAlert connection as a candidate Premium capability for
Misaki, not as a generic paid weather forecast.

The value proposition is:

> 美咲が、現実の暮らしまで気にかけてくれる。

Examples include grounded, proactive care about approaching rain, heat, snow or
wind. The weather/disaster fact must still come from EmergencyAlert's official
source pipeline; Misaki only adds relationship-aware wording and appropriate
delivery through her existing self-initiated messaging system.

This may also create a future funding loop: Misaki Premium revenue can help
support higher-quality official data acquisition for EmergencyAlert when that
cost becomes justified.

Do not implement or price this yet. Preserve it as a Premium product hypothesis
until EmergencyAlert's core rain experience and Misaki's current relationship /
Body Clock work are stable.
