-- Disposable PostgreSQL only. No Supabase production traffic.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
\ir ../../supabase/migrations/20261029021418_notification_radar_replay.sql
\ir ../../supabase/migrations/20261029023607_replay_area_images.sql
INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111');
SET ROLE service_role;
INSERT INTO public.rain_notification_evaluations(id,owner_id,target_id,event_type,snapshot,deadline_at,accepted_count)
VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','RAIN_ENDING','{"schemaVersion":1}',now()+interval '1 hour',1),
('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','RAIN_ENDING','{"schemaVersion":1}',now()+interval '1 hour',0);
DO $$
DECLARE claimed uuid; again uuid;
BEGIN
 SELECT id INTO claimed FROM public.claim_rain_image_jobs(2);
 IF claimed IS DISTINCT FROM '22222222-2222-4222-8222-222222222222'::uuid THEN RAISE EXCEPTION 'IMAGE_CLAIM_WRONG'; END IF;
 SELECT id INTO again FROM public.claim_rain_image_jobs(2);
 IF again IS NOT NULL THEN RAISE EXCEPTION 'IMAGE_CLAIM_DUPLICATED'; END IF;
 IF public.rain_image_storage_bytes()<=0 THEN RAISE EXCEPTION 'CAPACITY_NOT_REPORTED'; END IF;
END $$;
INSERT INTO public.rain_evaluation_images(evaluation_id,frame_kind,base_time,valid_time,width,height,crop_png,availability_mask,complete,metadata,expires_at)
VALUES('22222222-2222-4222-8222-222222222222','FORECAST','20261029020000','20261029023000',3,3,decode('89504e470d0a1a0a','hex'),decode('000101010101010101','hex'),false,'{}',now()+interval '1 day');
UPDATE public.rain_evaluation_images SET complete=true,availability_mask=decode('010101010101010101','hex');
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN UPDATE public.rain_evaluation_images SET metadata='{"changed":true}';
 EXCEPTION WHEN raise_exception THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'COMPLETE_IMAGE_MUTABLE'; END IF;
 IF (SELECT encode(crop_png,'hex') FROM public.rain_evaluation_images)<>'89504e470d0a1a0a' THEN RAISE EXCEPTION 'BYTEA_ROUNDTRIP'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM * FROM public.rain_evaluation_images; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'CLIENT_IMAGE_LEAK'; END IF;
 denied:=false;
 BEGIN PERFORM * FROM public.claim_rain_image_jobs(2); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'CLIENT_IMAGE_CLAIM'; END IF;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN PERFORM * FROM public.rain_image_runs; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'ANON_PROBE_LEAK'; END IF;
END $$;
RESET ROLE;
DELETE FROM public.rain_notification_evaluations WHERE id='22222222-2222-4222-8222-222222222222';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.rain_evaluation_images) THEN RAISE EXCEPTION 'IMAGES_NOT_CASCADED'; END IF; END $$;
ROLLBACK;
\echo 'area evidence bytea, permissions, exclusive jobs, immutability, cascade passed'
