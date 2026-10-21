-- Disposable PostgreSQL ONLY. Transaction rolls back all fixtures.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TABLE public.notification_deliveries (id bigint PRIMARY KEY);
INSERT INTO public.notification_deliveries(id) VALUES (101),(102),(103);
\ir ../../docs/sql/my-rain-push-outbox-prototype.sql
\ir ../../docs/sql/my-rain-push-outbox-prototype.sql

-- First claimant gets the durable event identity.
INSERT INTO public.rain_push_event_claims(owner_id,target_id,event_key,notification_id)
VALUES ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','episode-v1:rain-start:001',101);
-- Simulate a racing worker. ON CONFLICT can return no row, not a second claim.
INSERT INTO public.rain_push_event_claims(owner_id,target_id,event_key,notification_id)
VALUES ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','episode-v1:rain-start:001',102)
ON CONFLICT DO NOTHING;
-- Different notifications may have independent event keys; same notification cannot be claimed twice.
INSERT INTO public.rain_push_event_claims(owner_id,target_id,event_key,notification_id)
VALUES ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','episode-v1:rain-end:002',102);
INSERT INTO public.rain_push_event_claims(owner_id,target_id,event_key,notification_id)
VALUES ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','episode-v1:rain-other:003',101)
ON CONFLICT DO NOTHING;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.rain_push_event_claims) <> 2
 THEN RAISE EXCEPTION 'DUPLICATE_EVENT_CLAIM'; END IF;
END $$;

-- A crash after claiming an endpoint must not allow a second send.
INSERT INTO public.rain_push_subscription_attempts(event_claim_id,subscription_id)
SELECT id,'cccccccc-cccc-4ccc-cccc-cccccccccccc'
FROM public.rain_push_event_claims WHERE notification_id=101;
INSERT INTO public.rain_push_subscription_attempts(event_claim_id,subscription_id)
SELECT id,'cccccccc-cccc-4ccc-cccc-cccccccccccc'
FROM public.rain_push_event_claims WHERE notification_id=101
ON CONFLICT DO NOTHING;
INSERT INTO public.rain_push_subscription_attempts(event_claim_id,subscription_id)
SELECT id,'dddddddd-dddd-4ddd-dddd-dddddddddddd'
FROM public.rain_push_event_claims WHERE notification_id=101;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.rain_push_subscription_attempts) <> 2
 THEN RAISE EXCEPTION 'DUPLICATE_SUBSCRIPTION_SEND_CLAIM'; END IF;
END $$;

-- A claim may become uncertain, but it is never automatically reset to NEW.
UPDATE public.rain_push_subscription_attempts SET state='UNCERTAIN',settled_at=now()
WHERE subscription_id='cccccccc-cccc-4ccc-cccc-cccccccccccc';
INSERT INTO public.rain_push_subscription_attempts(event_claim_id,subscription_id)
SELECT id,'cccccccc-cccc-4ccc-cccc-cccccccccccc'
FROM public.rain_push_event_claims WHERE notification_id=101
ON CONFLICT DO NOTHING;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.rain_push_subscription_attempts) <> 2
 THEN RAISE EXCEPTION 'UNCERTAIN_ATTEMPT_RECLAIMED'; END IF;
END $$;

-- Authenticated users and anon must not see the private outbox.
SET ROLE authenticated;
DO $$
DECLARE denied boolean := false;
BEGIN
 BEGIN PERFORM count(*) FROM public.rain_push_event_claims;
 EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
 IF NOT denied THEN RAISE EXCEPTION 'USER_CAN_READ_EVENT_CLAIMS'; END IF;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$
DECLARE denied boolean := false;
BEGIN
 BEGIN PERFORM count(*) FROM public.rain_push_subscription_attempts;
 EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
 IF NOT denied THEN RAISE EXCEPTION 'ANON_CAN_READ_ATTEMPTS'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
\echo 'push-claim isolated SQL checks passed'
