-- Disposable database only; never insert browser test fixtures into production.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.watch_targets(id uuid PRIMARY KEY,owner_id uuid);
GRANT SELECT ON public.watch_targets TO authenticated;
CREATE TABLE public.rain_diagnostic_history(target_id uuid,checked_at timestamptz,current_status text,source_valid_at text);
ALTER TABLE public.rain_diagnostic_history ENABLE ROW LEVEL SECURITY;
\ir ../../supabase/migrations/20261029021418_notification_radar_replay.sql
\ir ../../supabase/migrations/20261029023607_replay_area_images.sql
\ir ../../supabase/migrations/20261029030141_rain_area_shadow.sql
\ir ../../supabase/migrations/20261029034246_rain_research_dashboard.sql
INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
INSERT INTO public.rain_research_admins(owner_id) VALUES('11111111-1111-4111-8111-111111111111');
INSERT INTO public.watch_targets VALUES('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222');
INSERT INTO public.rain_notification_evaluations(id,owner_id,target_id,event_type,snapshot,deadline_at,accepted_count)
VALUES('aaaaaaaa-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','RAIN_ENDING','{"schemaVersion":1}',now(),1),
('bbbbbbbb-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','RAIN_ENDING','{"schemaVersion":1}',now(),1);
INSERT INTO public.rain_area_shadow_results(evaluation_id,algorithm_version,features,comparison,expires_at)
SELECT id,'area-shadow-v1','[]','{}',now()+interval '1 day' FROM public.rain_notification_evaluations;
INSERT INTO public.rain_shadow_runs(mode,status) VALUES('REGULAR','OK');
INSERT INTO public.rain_diagnostic_history SELECT id,now(),'NO_RAIN','20261029030000' FROM public.watch_targets;
SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
DO $$ BEGIN
 IF (SELECT count(*) FROM public.rain_notification_evaluations)<>1 OR (SELECT count(*) FROM public.rain_area_shadow_results)<>1 THEN RAISE EXCEPTION 'DEVELOPER_CROSS_OWNER_ACCESS'; END IF;
 IF (SELECT count(*) FROM public.rain_shadow_runs)<>1 THEN RAISE EXCEPTION 'DEVELOPER_HEALTH_MISSING'; END IF;
 IF (SELECT count(checked_at) FROM public.rain_diagnostic_history)<>1 THEN RAISE EXCEPTION 'DIAGNOSTIC_OWNER_BOUNDARY'; END IF;
END $$;
INSERT INTO public.rain_research_ground_reports(evaluation_id,owner_id,observed_at,weather,report_source,location_confirmed)
VALUES('aaaaaaaa-0000-4000-8000-000000000001',auth.uid(),now()-interval '1 minute','RAIN','AT_LOCATION',true);
UPDATE public.rain_research_ground_reports SET weather='NO_RAIN';
DO $$ DECLARE denied boolean:=false; BEGIN
 BEGIN UPDATE public.rain_notification_evaluations SET accepted_count=10; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'DEVELOPER_CHANGED_DELIVERY'; END IF;
 denied:=false;
 BEGIN INSERT INTO public.rain_research_ground_reports(evaluation_id,owner_id,observed_at,weather,report_source,location_confirmed) VALUES('bbbbbbbb-0000-4000-8000-000000000002',auth.uid(),now(),'RAIN','AT_LOCATION',true); EXCEPTION WHEN insufficient_privilege OR foreign_key_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'CROSS_OWNER_GROUND_WRITE'; END IF;
 denied:=false;
 BEGIN INSERT INTO public.rain_research_ground_reports(evaluation_id,owner_id,observed_at,weather,report_source,location_confirmed) VALUES('aaaaaaaa-0000-4000-8000-000000000001',auth.uid(),now()+interval '1 hour','RAIN','AT_LOCATION',true); EXCEPTION WHEN raise_exception THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FUTURE_GROUND_REPORT'; END IF;
END $$;
SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
DO $$ DECLARE denied boolean:=false; BEGIN
 IF EXISTS(SELECT 1 FROM public.rain_notification_evaluations) OR EXISTS(SELECT 1 FROM public.rain_shadow_runs) OR EXISTS(SELECT 1 FROM public.rain_research_ground_reports) THEN RAISE EXCEPTION 'ORDINARY_USER_RESEARCH_LEAK'; END IF;
 BEGIN INSERT INTO public.rain_research_admins(owner_id) VALUES(auth.uid()); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'SELF_PROMOTION_ALLOWED'; END IF;
END $$;
RESET ROLE;
UPDATE public.rain_research_admins SET enabled=false;
SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.rain_notification_evaluations) OR EXISTS(SELECT 1 FROM public.rain_research_ground_reports) THEN RAISE EXCEPTION 'REVOKED_DEVELOPER_ACCESS'; END IF; END $$;
RESET ROLE; SET ROLE anon;
DO $$ DECLARE denied boolean:=false; BEGIN
 BEGIN PERFORM * FROM public.rain_research_admins; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'ANON_MEMBERSHIP_ACCESS'; END IF;
END $$;
RESET ROLE; ROLLBACK;
\echo 'developer allowlist, ordinary-user denial, owner boundaries, report writes and revocation passed'
