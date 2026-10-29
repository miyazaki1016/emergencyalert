-- Disposable PostgreSQL only. Does not read or alter Supabase production.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
\ir ../../supabase/migrations/20261029021418_notification_radar_replay.sql
INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111');
SET ROLE service_role;
INSERT INTO public.rain_notification_evaluations(id,owner_id,target_id,event_type,snapshot,deadline_at)
VALUES ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','RAIN_ENDING','{"schemaVersion":1}',now()+interval '1 hour');
DO $$
DECLARE first_claim uuid; second_claim uuid; blocked boolean:=false;
BEGIN
 SELECT id INTO first_claim FROM public.claim_rain_evaluations(5);
 SELECT id INTO second_claim FROM public.claim_rain_evaluations(5);
 IF first_claim IS NULL OR second_claim IS NOT NULL THEN RAISE EXCEPTION 'CLAIM_NOT_EXCLUSIVE'; END IF;
 UPDATE public.rain_notification_evaluations SET accepted_count=1;
 BEGIN UPDATE public.rain_notification_evaluations SET snapshot='{"schemaVersion":1,"changed":true}';
 EXCEPTION WHEN raise_exception THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'SNAPSHOT_MUTABLE'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM * FROM public.rain_notification_evaluations;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'CLIENT_READ_LEAK'; END IF;
 denied:=false;
 BEGIN PERFORM * FROM public.claim_rain_evaluations(1);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'CLIENT_CLAIM_ALLOWED'; END IF;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM * FROM public.rain_notification_evaluations;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'ANON_READ_LEAK'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
\echo 'rain replay schema, permissions, snapshot immutability and leases passed'
