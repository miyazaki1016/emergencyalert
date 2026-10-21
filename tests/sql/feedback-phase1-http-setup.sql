-- DISPOSABLE DATABASE ONLY. Use with the local PostgREST CI HTTP job.
-- Never run this fixture on Supabase production.
\set ON_ERROR_STOP on

CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TABLE public.notification_deliveries (
  id bigint PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL,
  delivered_count integer NOT NULL DEFAULT 1 CHECK (delivered_count > 0),
  target_id uuid NOT NULL,
  body text NOT NULL,
  delivered_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_read_notification ON public.notification_deliveries
 FOR SELECT TO authenticated USING (owner_id = (select auth.uid()));
GRANT SELECT ON public.notification_deliveries TO authenticated;

INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.notification_deliveries(id, owner_id, event_type, target_id, body) VALUES
 (101,'11111111-1111-4111-8111-111111111111','RAIN_APPROACHING','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','雨が近づくよ'),
 (102,'11111111-1111-4111-8111-111111111111','RAIN_ENDING','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','もうすぐ止むよ'),
 (201,'22222222-2222-4222-8222-222222222222','RAIN_ENDING','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','もうすぐ止むよ'),
 (103,'11111111-1111-4111-8111-111111111111','SEVERE_RAIN_1','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','強い雨だよ');
\ir ../../docs/sql/my-rain-feedback-phase1.sql

-- PostgREST connects as postgres in this disposable container and can SET ROLE.
GRANT USAGE ON SCHEMA public TO authenticated, anon;
