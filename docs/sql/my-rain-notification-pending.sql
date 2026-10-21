-- STAGED ONLY; NEVER auto-apply to production.
-- Before the Push-ID-first worker, allow a pending delivery row (delivered_count = 0).
-- Read-only production schema inspection on 2026-10-21 found:
-- notification_deliveries_delivered_count_check: CHECK (delivered_count > 0).
-- Without this migration, the pending-first worker will fail to insert and will
-- intentionally decline to send the Push. Existing >0 rows remain valid.
--
-- Rollout: isolated Postgres + Supabase HTTP/RLS tests -> explicit production
-- approval -> apply additive evidence/feedback SQL and this CHECK adjustment
-- -> inspect schema cache and worker compatibility -> separately approve worker.
-- Roll back worker first. Preserve pending rows for incident diagnosis.
ALTER TABLE public.notification_deliveries
  DROP CONSTRAINT IF EXISTS notification_deliveries_delivered_count_check;
ALTER TABLE public.notification_deliveries
  ADD CONSTRAINT notification_deliveries_delivered_count_check
  CHECK (delivered_count >= 0);
