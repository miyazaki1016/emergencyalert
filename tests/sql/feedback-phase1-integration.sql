-- Disposable PostgreSQL ONLY; do not run against production.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.notification_deliveries (
 id bigint PRIMARY KEY, owner_id uuid NOT NULL, event_type text NOT NULL,
 delivered_count integer NOT NULL DEFAULT 1 CHECK (delivered_count > 0)
);
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_own_deliveries ON public.notification_deliveries
 FOR SELECT TO authenticated USING (owner_id = (select auth.uid()));
GRANT SELECT ON public.notification_deliveries TO authenticated;
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.notification_deliveries(id,owner_id,event_type) VALUES
 (1,'11111111-1111-4111-8111-111111111111','ACTIONABLE_RAIN_APPROACHING'),
 (2,'11111111-1111-4111-8111-111111111111','RAIN_ENDING'),
 (3,'22222222-2222-4222-8222-222222222222','RAIN_ENDING'),
 (4,'11111111-1111-4111-8111-111111111111','SEVERE_RAIN_1');
\ir ../../docs/sql/my-rain-feedback-phase1.sql
\ir ../../docs/sql/my-rain-feedback-phase1.sql
SET ROLE authenticated;
SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
 VALUES (1,auth.uid(),'RAINED');
INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
 VALUES (1,auth.uid(),'DID_NOT_RAIN')
 ON CONFLICT (notification_id) DO UPDATE SET actual_weather=excluded.actual_weather,updated_at=now();
INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
 VALUES (2,auth.uid(),'ALREADY_DRY');
RESET ROLE;
-- Existing rows retain unknown observed time after an idempotent migration.
\ir ../../docs/sql/my-rain-feedback-observation-time.sql
\ir ../../docs/sql/my-rain-feedback-observation-time.sql
SET ROLE authenticated;
SELECT 1 / CASE WHEN (SELECT observed_at IS NULL AND observed_time_source='UNKNOWN'
   FROM public.rain_notification_feedback WHERE notification_id=1)
   THEN 1 ELSE 0 END AS historical_time_is_unknown;
UPDATE public.rain_notification_feedback
  SET observed_at='2026-10-21T00:40:00Z', observed_time_source='RECALLED'
  WHERE notification_id=1;
SELECT 1 / CASE WHEN (SELECT observed_at IS NOT NULL AND observed_time_source='RECALLED'
   FROM public.rain_notification_feedback WHERE notification_id=1)
   THEN 1 ELSE 0 END AS recalled_time_persisted;
SELECT 1 / CASE WHEN EXISTS(SELECT 1 FROM pg_constraint
    WHERE conrelid='public.rain_notification_feedback'::regclass
    AND conname='rain_notification_feedback_observation_pair_check')
  THEN 1 ELSE 0 END AS observation_pair_constraint_exists;

DO $$
DECLARE blocked boolean;
BEGIN
 IF (SELECT count(*) FROM public.rain_notification_feedback) <> 2 THEN RAISE EXCEPTION 'OWN_READ_FAILED'; END IF;
 IF (SELECT actual_weather FROM public.rain_notification_feedback WHERE notification_id=1) <> 'DID_NOT_RAIN' THEN RAISE EXCEPTION 'EDIT_FAILED'; END IF;
 blocked := false;
 BEGIN INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
  VALUES (3,auth.uid(),'STOPPED');
 EXCEPTION WHEN insufficient_privilege OR check_violation THEN blocked := true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'CROSS_OWNER_INSERT_ACCEPTED'; END IF;
 blocked := false;
 BEGIN INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
  VALUES (4,auth.uid(),'RAINED');
 EXCEPTION WHEN insufficient_privilege OR check_violation THEN blocked := true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'UNSUPPORTED_EVENT_ACCEPTED'; END IF;
 blocked := false;
 BEGIN UPDATE public.rain_notification_feedback SET actual_weather='STOPPED' WHERE notification_id=1;
 EXCEPTION WHEN insufficient_privilege OR check_violation THEN blocked := true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'WRONG_OUTCOME_ACCEPTED'; END IF;
END $$;
SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
DO $$
BEGIN
 IF (SELECT count(*) FROM public.rain_notification_feedback) <> 0 THEN RAISE EXCEPTION 'CROSS_OWNER_FEEDBACK_LEAK'; END IF;
 IF (SELECT count(*) FROM public.notification_deliveries) <> 1 THEN RAISE EXCEPTION 'CROSS_OWNER_DELIVERY_LEAK'; END IF;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$
DECLARE blocked boolean := false;
BEGIN
 BEGIN PERFORM count(*) FROM public.rain_notification_feedback;
 EXCEPTION WHEN insufficient_privilege THEN blocked := true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'ANON_ACCESS_ACCEPTED'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
\echo 'phase-one feedback SQL checks passed on disposable PostgreSQL'
