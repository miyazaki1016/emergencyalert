# Full watch-rain dispatch-path review (2026-11-09)

Read `supabase/functions/watch-rain/index.ts` on main, in addition to the engine and episode helpers.

1. `forecastEpisodeDecision(episode, enabled, actionable, severeLevel, ending)` determines whether a push is attempted.
2. `rain.event.actionableAt` selects the intensity class used for notification text; existing `startsAt` is available but does not drive an earlier send.
3. On recorded push intents with subscriptions, the episode is persisted with `approachNotified = previous || actionable || severeEscalation`, **before** the final accepted/failed counts and notification_deliveries linkage are settled. This is intentional durable idempotency behavior; replay must not casually alter it.
4. `notification_deliveries` rows are inserted only when delivered>0. Evaluations can exist without linked delivery rows; a delivered-only cohort cannot quantify false-positive alerts or suppression.
5. Existing text distinguishes persistent light rain and other actionable cases; `initialRaining=false` and `returningRain=false` are constants in the inspected code, so these branches do not currently represent independent signals.

**Replay requirements:** use a pure simulation of the episode state and original snapshot data; never invoke guardedPush or persist. Replay negative/non-delivered evaluations as well as delivered. Track whether candidate would consume approachNotified and whether subsequent actionable notifications are suppressed. Preserve severe escalation and ending behavior. Compare original and candidate against the same independently archived radar observations, and label unknown ground truth explicitly.

**Recommendation:** Do not ship an early notification or alter the latch yet. An informational onset indicator that does not send push or set approachNotified is the lowest-risk experiment.
