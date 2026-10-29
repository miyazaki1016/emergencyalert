ALTER TABLE public.rain_notification_evaluations
 ADD COLUMN shadow_state text NOT NULL DEFAULT 'PENDING' CHECK(shadow_state IN ('PENDING','COMPLETE','INCOMPLETE')),
 ADD COLUMN shadow_next_attempt_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN shadow_attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN shadow_lease_id uuid,
 ADD COLUMN shadow_leased_until timestamptz,
 ADD COLUMN shadow_error text;
CREATE INDEX rain_shadow_jobs_due_idx ON public.rain_notification_evaluations(shadow_next_attempt_at)
 WHERE shadow_state='PENDING' AND accepted_count>0;
CREATE TABLE public.rain_area_shadow_results (
 evaluation_id uuid NOT NULL REFERENCES public.rain_notification_evaluations(id) ON DELETE CASCADE,
 algorithm_version text NOT NULL,
 features jsonb NOT NULL CHECK(jsonb_typeof(features)='array'),
 comparison jsonb NOT NULL CHECK(jsonb_typeof(comparison)='object'),
 computed_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(evaluation_id,algorithm_version)
);
CREATE INDEX rain_area_shadow_expiry_idx ON public.rain_area_shadow_results(expires_at);
ALTER TABLE public.rain_area_shadow_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rain_area_shadow_results FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.rain_area_shadow_results TO service_role;
CREATE TABLE public.rain_shadow_runs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 mode text NOT NULL CHECK(mode IN ('REGULAR','PROBE')),
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 status text NOT NULL CHECK(status IN ('RUNNING','OK','ERROR')),
 summary jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX rain_shadow_runs_time_idx ON public.rain_shadow_runs(started_at);
ALTER TABLE public.rain_shadow_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rain_shadow_runs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.rain_shadow_runs TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.rain_shadow_runs_id_seq TO service_role;
CREATE FUNCTION public.rain_shadow_storage_bytes() RETURNS bigint
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT pg_total_relation_size('public.rain_area_shadow_results'::regclass);
$$;
REVOKE ALL ON FUNCTION public.rain_shadow_storage_bytes() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rain_shadow_storage_bytes() TO service_role;
CREATE FUNCTION public.claim_rain_shadow_jobs(batch_size integer DEFAULT 2)
RETURNS SETOF public.rain_notification_evaluations
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 UPDATE public.rain_notification_evaluations e SET
 shadow_lease_id=gen_random_uuid(),shadow_leased_until=now()+interval '2 minutes',shadow_attempts=e.shadow_attempts+1
 FROM (SELECT q.id FROM public.rain_notification_evaluations q
 WHERE q.shadow_state='PENDING' AND q.accepted_count>0 AND q.shadow_next_attempt_at<=now()
 AND (q.shadow_leased_until IS NULL OR q.shadow_leased_until<now())
 AND (EXISTS(SELECT 1 FROM public.rain_evaluation_images i WHERE i.evaluation_id=q.id)
      OR q.image_state='INCOMPLETE' OR q.deadline_at+interval '20 minutes'<now())
 AND pg_total_relation_size('public.rain_area_shadow_results'::regclass)<33554432
 ORDER BY q.shadow_next_attempt_at LIMIT greatest(0,least(batch_size,2)) FOR UPDATE SKIP LOCKED) jobs
 WHERE e.id=jobs.id RETURNING e.*;
$$;
REVOKE ALL ON FUNCTION public.claim_rain_shadow_jobs(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rain_shadow_jobs(integer) TO service_role;
