-- Read-only preflight: safe before production migration. Does NOT alter rows or schema.
-- Run with sufficient SELECT/metadata permissions.
SELECT
  count(*) AS existing_feedback_rows,
  count(*) FILTER (WHERE actual_weather = 'UNKNOWN') AS unknown_weather_answers
FROM public.rain_notification_feedback;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rain_notification_feedback'
ORDER BY ordinal_position;

SELECT relrowsecurity AS row_level_security_enabled
FROM pg_class WHERE oid = 'public.rain_notification_feedback'::regclass;

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.rain_notification_feedback'::regclass
ORDER BY conname;

-- Compare these read-only outputs to the documented expected current state.
-- Stop for review if the table is absent, RLS is disabled, or the existing
-- columns/constraints diverge from the schema under test.
