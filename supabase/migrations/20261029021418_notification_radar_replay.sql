-- Additive, private evaluation records. Existing delivery/state tables untouched.
CREATE TABLE public.rain_notification_evaluations (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 target_id uuid NOT NULL,
 notification_id bigint,
 event_type text NOT NULL CHECK(event_type IN ('RAIN_APPROACHING','ACTIONABLE_RAIN_APPROACHING','RAIN_ENDING')),
 target_time timestamptz,
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object' AND snapshot->>'schemaVersion'='1'),
 accepted_count integer NOT NULL DEFAULT 0 CHECK(accepted_count>=0),
 failed_count integer NOT NULL DEFAULT 0 CHECK(failed_count>=0),
 unknown_count integer NOT NULL DEFAULT 0 CHECK(unknown_count>=0),
 delivery_status text NOT NULL DEFAULT 'UNKNOWN' CHECK(delivery_status IN ('UNKNOWN','ACCEPTED','FAILED','NO_SUBSCRIPTIONS')),
 delivery_record_status text NOT NULL DEFAULT 'UNKNOWN' CHECK(delivery_record_status IN ('UNKNOWN','LINKED','WRITE_FAILED','NOT_APPLICABLE')),
 send_started_at timestamptz,
 send_settled_at timestamptz,
 evidence jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(evidence)='array'),
 radar_result jsonb,
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','COMPLETE','INDETERMINATE')),
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 deadline_at timestamptz NOT NULL,
 lease_id uuid,
 leased_until timestamptz,
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '90 days'
);
CREATE INDEX rain_evaluations_due_idx ON public.rain_notification_evaluations(next_attempt_at) WHERE state='PENDING';
CREATE INDEX rain_evaluations_owner_idx ON public.rain_notification_evaluations(owner_id);
CREATE INDEX rain_evaluations_notification_idx ON public.rain_notification_evaluations(notification_id) WHERE notification_id IS NOT NULL;
CREATE INDEX rain_evaluations_expiry_idx ON public.rain_notification_evaluations(expires_at);
ALTER TABLE public.rain_notification_evaluations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rain_notification_evaluations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.rain_notification_evaluations TO service_role;
CREATE TABLE public.rain_evaluation_runs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 status text NOT NULL CHECK(status IN ('RUNNING','OK','ERROR')),
 summary jsonb NOT NULL DEFAULT '{}'
);
ALTER TABLE public.rain_evaluation_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rain_evaluation_runs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.rain_evaluation_runs TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.rain_evaluation_runs_id_seq TO service_role;
CREATE INDEX rain_evaluation_runs_time_idx ON public.rain_evaluation_runs(started_at);
CREATE FUNCTION public.claim_rain_evaluations(batch_size integer DEFAULT 5)
RETURNS SETOF public.rain_notification_evaluations
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 UPDATE public.rain_notification_evaluations e SET
  lease_id=gen_random_uuid(),leased_until=now()+interval '2 minutes',attempts=e.attempts+1
 FROM (SELECT id FROM public.rain_notification_evaluations
       WHERE state='PENDING' AND next_attempt_at<=now() AND (leased_until IS NULL OR leased_until<now())
       ORDER BY next_attempt_at LIMIT greatest(0,least(batch_size,10)) FOR UPDATE SKIP LOCKED) q
 WHERE e.id=q.id RETURNING e.*;
$$;
REVOKE ALL ON FUNCTION public.claim_rain_evaluations(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rain_evaluations(integer) TO service_role;
-- Immutability also protects against accidental future service-worker updates.
CREATE FUNCTION public.protect_rain_evaluation_snapshot() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
 OR NEW.target_id IS DISTINCT FROM OLD.target_id OR NEW.event_type IS DISTINCT FROM OLD.event_type
 OR NEW.target_time IS DISTINCT FROM OLD.target_time OR NEW.deadline_at IS DISTINCT FROM OLD.deadline_at
 OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'IMMUTABLE_RAIN_EVALUATION'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_rain_evaluation_snapshot() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_rain_evaluation_snapshot BEFORE UPDATE ON public.rain_notification_evaluations
FOR EACH ROW EXECUTE FUNCTION public.protect_rain_evaluation_snapshot();
