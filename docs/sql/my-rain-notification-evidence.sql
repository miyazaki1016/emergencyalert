-- Staged only. Apply to the EmergencyAlert database before deploying the matching watch-rain worker and page.
-- Existing delivery records remain valid (snapshot null for historical notifications).
alter table public.notification_deliveries
  add column if not exists decision_snapshot jsonb;

comment on column public.notification_deliveries.decision_snapshot is
  'Immutable-at-write diagnostic evidence used to justify the delivered notification; null for old records.';
