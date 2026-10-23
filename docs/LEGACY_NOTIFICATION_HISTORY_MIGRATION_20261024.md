# Legacy notification history migration — 2026-10-24

## Verified state
- Previous anonymous owner: 132 notification_deliveries, 3 feedback responses, 3 watch targets, 1 push subscription.
- Current anonymous owner: 5 watch targets, 1 push subscription, no delivery rows at time of inspection.
- 12 old deliveries fall within the rolling 7-day feedback window.
- notification_deliveries has SELECT-own policy only; client cannot safely insert or update these rows.
- Feedback is keyed to notification_deliveries.id and is restricted to own deliveries.
- Current NotificationFeedbackHistory reads notification_deliveries from last seven days and allows feedback.

## User decisions
- Restore history; old answers can be discarded and answered again.
- Old account data is not required after successful migration.
- Preserve current anonymous identity, five targets and working push registration.

## Migration safety gates
1. Inspect watch-rain's delivery deduplication queries before changing any notification_deliveries rows. Moving or duplicating rows in this table may alter send suppression.
2. Implement a separate archive table with ownership RLS and an explicit source-delivery identity; backfill historical deliveries from the old owner to the current owner with an idempotent transaction. Keep delivery pipeline reading only live notification_deliveries.
3. Extend feedback UI to read both current deliveries and archived deliveries with separate answer persistence, avoiding ID collisions and permitting fresh answers.
4. Verify recent 12 records, older 120 records, UI count and answers, then verify push delivery for current owner.
5. Only after validation, retire old-owner push subscription and consider deleting old owner data. Deletion requires an explicit final check and must not remove active browser subscription or current-owner data.
6. Preserve source data until read-back and user acceptance. No production SQL deletion or bulk rewrite as part of the planning phase.

## Implementation status
Planning only. No database mutation, deletion, or deployment from this checkpoint.

## Decision update — 2026-10-24
- User elected not to restore old notification history; restart history on current owner.
- Old and current owners have one push_subscriptions row each with identical endpoint fingerprint (`80b4ce43ce24`), potentially causing duplicate sends.
- Old owner has 3 targets; current owner has 5 targets. Preserve current data.
- Attempt to delete only the old owner's duplicate push subscription was blocked by the tool safety gate. No deletion occurred; do not bypass.
- Next: authorized cleanup path, verify old=0/current=1 and actual push delivery. Assess old targets/history deletion separately.
