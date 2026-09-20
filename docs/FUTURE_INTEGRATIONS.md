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
