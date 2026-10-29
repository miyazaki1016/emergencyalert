-- Disposable database only.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
\ir ../../supabase/migrations/20261029021418_notification_radar_replay.sql
\ir ../../supabase/migrations/20261029023607_replay_area_images.sql
\ir ../../supabase/migrations/20261029030141_rain_area_shadow.sql
INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111');
SET ROLE service_role;
INSERT INTO public.rain_notification_evaluations(id,owner_id,target_id,event_type,snapshot,deadline_at,accepted_count,image_state)
VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','RAIN_ENDING','{"schemaVersion":1}',now()+interval '1 hour',1,'INCOMPLETE'),
('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','RAIN_ENDING','{"schemaVersion":1}',now()+interval '1 hour',0,'INCOMPLETE');
DO $$
DECLARE first_claim uuid; second_claim uuid;
BEGIN
 SELECT id INTO first_claim FROM public.claim_rain_shadow_jobs(2);
 SELECT id INTO second_claim FROM public.claim_rain_shadow_jobs(2);
 IF first_claim IS DISTINCT FROM '22222222-2222-4222-8222-222222222222'::uuid OR second_claim IS NOT NULL THEN RAISE EXCEPTION 'SHADOW_CLAIM_INCORRECT'; END IF;
END $$;
INSERT INTO public.rain_area_shadow_results(evaluation_id,algorithm_version,features,comparison,expires_at)
VALUES('22222222-2222-4222-8222-222222222222','area-shadow-v1','[]','{"experimental":true}',now()+interval '1 day');
UPDATE public.rain_notification_evaluations SET shadow_state='COMPLETE' WHERE id='22222222-2222-4222-8222-222222222222';
RESET ROLE;
SET ROLE authenticated;
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM * FROM public.rain_area_shadow_results; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'CLIENT_SHADOW_LEAK'; END IF;
 denied:=false;
 BEGIN PERFORM * FROM public.claim_rain_shadow_jobs(2); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'CLIENT_SHADOW_CLAIM'; END IF;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM * FROM public.rain_shadow_runs; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'ANON_SHADOW_RUN_LEAK'; END IF;
END $$;
RESET ROLE;
DELETE FROM public.rain_notification_evaluations WHERE id='22222222-2222-4222-8222-222222222222';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.rain_area_shadow_results) THEN RAISE EXCEPTION 'SHADOW_CASCADE_FAILED'; END IF; END $$;
ROLLBACK;
\echo 'shadow schema, permissions, claim isolation, cascade passed'
