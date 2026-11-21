# Wider archived-snapshot cohort: early-onset signal (2026-11-09)

Read-only Supabase aggregation of `rain_notification_evaluations`, `event_type='ACTIONABLE_RAIN_APPROACHING'`, Oct 29–Nov 9. **329 evaluations** with complete archived forecast and observation arrays, not 329 independent rain episodes or ground-truth events. This cohort is larger than the 20 linked delivered cases previously evaluated.

| Delivery status | Evaluations | First rain earlier than actionable | Gap >=10 min | Earlier onset >=5 min after decision | Earlier onset >=10 min after decision |
|---|---:|---:|---:|---:|---:|
| ACCEPTED | 28 | 23 | 16 | 23 | 19 |
| NO_SUBSCRIPTIONS | 301 | 220 | 123 | 220 | 108 |
| Total | 329 | 243 | 139 | 243 | 127 |

All 329 have snapshot forecast and observation arrays. The 301 NO_SUBSCRIPTIONS evaluations are **not counterfactual negative weather events**; they are positive actionable forecast decisions that lacked an active push subscription. The 28 ACCEPTED evaluation rows include deliveries without necessarily linked `notification_id` and may differ from the 20-case grade cohort. Therefore do not claim these 329 prove precision, recall, or a false-positive rate.

A non-sending onset indicator could have a forecast lead of >=5 min in 243 snapshots, but may be redundant with an already actionable forecast and does not prove improved user utility. Next evaluation must reconstruct weather episodes and include DRY/RAIN_AHEAD snapshots from other archives, with independent radar outcomes and no subscription-status proxy for weather negatives. The 329 evaluations are useful for an offline candidate-signal feasibility audit, not for sending notifications. No production or DB mutation.
