\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE TABLE public.watch_targets(id uuid PRIMARY KEY);
CREATE TABLE public.watch_states(target_id uuid PRIMARY KEY,last_event jsonb,last_checked_at timestamptz,last_notified_at timestamptz,rain_ending_notified boolean,clear_streak smallint,rain_streak smallint,rain_confirmed_notified boolean,confirmed_weather text,severe_rain_level smallint,updated_at timestamptz);
GRANT SELECT,INSERT,UPDATE ON public.watch_states TO service_role;
\ir ../../supabase/migrations/20261029075241_forecast_notification_episodes.sql
INSERT INTO public.watch_targets VALUES('11111111-1111-4111-8111-111111111111');
