-- Disposable PostgreSQL fixture: never run against Supabase production.
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
  id bigint PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL
);
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_deliveries ON public.notification_deliveries
  FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));
GRANT SELECT ON public.notification_deliveries TO authenticated;

INSERT INTO auth.users(id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.notification_deliveries (id,owner_id,event_type) VALUES
  (1,'11111111-1111-4111-8111-111111111111','ACTIONABLE_RAIN_APPROACHING'),
  (2,'11111111-1111-4111-8111-111111111111','RAIN_ENDING'),
  (3,'22222222-2222-4222-8222-222222222222','RAIN_ENDING'),
  (4,'11111111-1111-4111-8111-111111111111','SEVERE_RAIN_1');

-- Evidence migration must preserve all existing delivered notifications and be idempotent.
\ir ../../docs/sql/my-rain-notification-evidence.sql
\ir ../../docs/sql/my-rain-notification-evidence.sql
DO $$
BEGIN
  IF (SELECT count(*) FROM public.notification_deliveries) <> 4 THEN
    RAISE EXCEPTION 'EVIDENCE_MIGRATION_CHANGED_EXISTING_DELIVERIES';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notification_deliveries WHERE decision_snapshot IS NOT NULL) THEN
    RAISE EXCEPTION 'EVIDENCE_MIGRATION_INVENTED_OLD_SNAPSHOTS';
  END IF;
END $$;
UPDATE public.notification_deliveries SET decision_snapshot='{"schemaVersion":1,"motion":{"status":"UNKNOWN"}}'::jsonb WHERE id=1;
DO $$
BEGIN
  IF (SELECT decision_snapshot->>'schemaVersion' FROM public.notification_deliveries WHERE id=1) <> '1' THEN
    RAISE EXCEPTION 'EVIDENCE_JSONB_WRITE_FAILED';
  END IF;
END $$;

\ir ../../docs/sql/my-rain-notification-feedback.sql
-- Ensure the migration can be rerun without a duplicate policy failure.
\ir ../../docs/sql/my-rain-notification-feedback.sql

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
  VALUES (1,auth.uid(),'DID_NOT_RAIN');
INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
  VALUES (1,auth.uid(),'RAINED')
  ON CONFLICT(notification_id) DO UPDATE
  SET actual_weather=excluded.actual_weather,updated_at=now();
INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
  VALUES (2,auth.uid(),'STOPPED');

DO $$
BEGIN
  IF (SELECT actual_weather FROM public.rain_notification_feedback WHERE notification_id=1) <> 'RAINED' THEN
    RAISE EXCEPTION 'OWN_UPSERT_FAILED';
  END IF;
  IF (SELECT count(*) FROM public.rain_notification_feedback) <> 2 THEN
    RAISE EXCEPTION 'OWN_SELECT_INCORRECT';
  END IF;
END $$;

-- All invalid writes must fail, not be silently accepted.
DO $$
DECLARE blocked boolean;
BEGIN
  blocked := false;
  BEGIN
    INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
      VALUES (3,auth.uid(),'STOPPED'); -- different owner's notification
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'CROSS_OWNER_NOTIFICATION_ACCEPTED'; END IF;

  blocked := false;
  BEGIN
    INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
      VALUES (4,auth.uid(),'RAINED'); -- severe alert has no defined question
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'UNSUPPORTED_EVENT_ACCEPTED'; END IF;

  blocked := false;
  BEGIN
    UPDATE public.rain_notification_feedback
      SET actual_weather='STOPPED'
      WHERE notification_id=1; -- wrong outcome for rain-start
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'MISMATCHED_OUTCOME_ACCEPTED'; END IF;

  blocked := false;
  BEGIN
    INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
      VALUES (2,'22222222-2222-4222-8222-222222222222','STOPPED')
      ON CONFLICT(notification_id) DO UPDATE SET owner_id=excluded.owner_id;
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'OWNER_REASSIGN_ACCEPTED'; END IF;
END $$;

SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
DO $$
BEGIN
  IF (SELECT count(*) FROM public.rain_notification_feedback) <> 0 THEN
    RAISE EXCEPTION 'CROSS_OWNER_READ_LEAK';
  END IF;
  IF (SELECT count(*) FROM public.notification_deliveries) <> 1 THEN
    RAISE EXCEPTION 'DELIVERY_RLS_LEAK';
  END IF;
END $$;
INSERT INTO public.rain_notification_feedback(notification_id,owner_id,actual_weather)
  VALUES (3,auth.uid(),'ALREADY_DRY');
DO $$
BEGIN
  IF (SELECT count(*) FROM public.rain_notification_feedback) <> 1 THEN
    RAISE EXCEPTION 'USER_B_OWN_SELECT_FAILED';
  END IF;
END $$;

-- A visitor without an authenticated session must not read or modify feedback.
RESET ROLE;
SET ROLE anon;
DO $guard$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM count(*) FROM public.rain_notification_feedback;
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'ANON_FEEDBACK_READ_ACCEPTED'; END IF;
END $guard$;
RESET ROLE;

-- An authenticated owner can read their evidence but must not alter delivery
-- records via the public API. The service worker uses service-role privileges.
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $guard$
DECLARE blocked boolean := false;
BEGIN
  IF (SELECT decision_snapshot->>'schemaVersion'
      FROM public.notification_deliveries WHERE id=1) <> '1' THEN
    RAISE EXCEPTION 'OWN_EVIDENCE_NOT_READABLE';
  END IF;
  BEGIN
    UPDATE public.notification_deliveries SET decision_snapshot='{}'::jsonb WHERE id=1;
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'CLIENT_CHANGED_DELIVERY_EVIDENCE'; END IF;
END $guard$;
RESET ROLE;
ROLLBACK;
\echo 'feedback RLS integration checks passed (disposable database)'
