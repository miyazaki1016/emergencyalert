-- Proposed migration for feedback observation time. REVIEW ONLY; NOT APPLIED to production.
-- Prior answers retain NULL observed_at. updated_at is never copied to observed_at.
-- Apply in a caller-managed transaction after backup/approval; safe to rerun.
ALTER TABLE public.rain_notification_feedback
  ADD COLUMN IF NOT EXISTS observed_at timestamptz,
  ADD COLUMN IF NOT EXISTS observed_time_source text NOT NULL DEFAULT 'UNKNOWN';
-- Avoid dropping and briefly removing an existing consistency constraint
-- when the migration is executed again.
DO $observation_constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.rain_notification_feedback'::regclass
      AND conname = 'rain_notification_feedback_observation_pair_check'
  ) THEN
    ALTER TABLE public.rain_notification_feedback
      ADD CONSTRAINT rain_notification_feedback_observation_pair_check
      CHECK (
        (observed_time_source = 'UNKNOWN' AND observed_at IS NULL)
        OR
        (observed_time_source IN ('AT_RESPONSE', 'RECALLED') AND observed_at IS NOT NULL)
      );
  END IF;
END
$observation_constraint$;
