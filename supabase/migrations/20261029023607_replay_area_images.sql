-- Independent image collection: no Push/state/delivery constraint changes.
ALTER TABLE public.rain_notification_evaluations
 ADD COLUMN image_state text NOT NULL DEFAULT 'PENDING' CHECK(image_state IN ('PENDING','COMPLETE','INCOMPLETE')),
 ADD COLUMN image_next_attempt_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN image_attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN image_lease_id uuid,
 ADD COLUMN image_leased_until timestamptz,
 ADD COLUMN image_error text;
CREATE INDEX rain_image_jobs_due_idx ON public.rain_notification_evaluations(image_next_attempt_at)
 WHERE image_state='PENDING' AND accepted_count>0;
CREATE TABLE public.rain_evaluation_images (
 evaluation_id uuid NOT NULL REFERENCES public.rain_notification_evaluations(id) ON DELETE CASCADE,
 frame_kind text NOT NULL CHECK(frame_kind IN ('FORECAST','INPUT_OBSERVATION','OBSERVATION')),
 base_time text NOT NULL CHECK(base_time ~ '^\d{14}$'),
 valid_time text NOT NULL CHECK(valid_time ~ '^\d{14}$'),
 width smallint NOT NULL CHECK(width BETWEEN 3 AND 63),
 height smallint NOT NULL CHECK(height BETWEEN 3 AND 63),
 crop_png bytea NOT NULL CHECK(octet_length(crop_png)<=16384 AND substring(crop_png FROM 1 FOR 8)=decode('89504e470d0a1a0a','hex')),
 availability_mask bytea NOT NULL CHECK(octet_length(availability_mask)=width*height),
 complete boolean NOT NULL CHECK(complete=(position(decode('00','hex') IN availability_mask)=0)),
 metadata jsonb NOT NULL CHECK(jsonb_typeof(metadata)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(evaluation_id,frame_kind,base_time,valid_time)
);
CREATE INDEX rain_evaluation_images_expiry_idx ON public.rain_evaluation_images(expires_at);
ALTER TABLE public.rain_evaluation_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rain_evaluation_images FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.rain_evaluation_images TO service_role;
CREATE FUNCTION public.protect_complete_rain_image() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF OLD.complete OR NEW.evaluation_id IS DISTINCT FROM OLD.evaluation_id
 OR NEW.frame_kind IS DISTINCT FROM OLD.frame_kind OR NEW.base_time IS DISTINCT FROM OLD.base_time
 OR NEW.valid_time IS DISTINCT FROM OLD.valid_time THEN RAISE EXCEPTION 'IMMUTABLE_COMPLETE_RAIN_IMAGE'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_complete_rain_image() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_complete_rain_image BEFORE UPDATE ON public.rain_evaluation_images
FOR EACH ROW EXECUTE FUNCTION public.protect_complete_rain_image();
CREATE TABLE public.rain_image_runs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 mode text NOT NULL CHECK(mode IN ('REGULAR','PROBE')),
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 status text NOT NULL CHECK(status IN ('RUNNING','OK','ERROR')),
 summary jsonb NOT NULL DEFAULT '{}',
 probe_png bytea CHECK(octet_length(probe_png)<=16384),
 probe_mask bytea,
 probe_metadata jsonb
);
ALTER TABLE public.rain_image_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rain_image_runs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.rain_image_runs TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.rain_image_runs_id_seq TO service_role;
CREATE INDEX rain_image_runs_time_idx ON public.rain_image_runs(started_at);
CREATE FUNCTION public.rain_image_storage_bytes() RETURNS bigint
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT pg_total_relation_size('public.rain_evaluation_images'::regclass);
$$;
REVOKE ALL ON FUNCTION public.rain_image_storage_bytes() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rain_image_storage_bytes() TO service_role;
CREATE FUNCTION public.claim_rain_image_jobs(batch_size integer DEFAULT 2)
RETURNS SETOF public.rain_notification_evaluations
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 UPDATE public.rain_notification_evaluations e SET
 image_lease_id=gen_random_uuid(),image_leased_until=now()+interval '2 minutes',image_attempts=e.image_attempts+1
 FROM (SELECT id FROM public.rain_notification_evaluations
 WHERE image_state='PENDING' AND accepted_count>0 AND image_next_attempt_at<=now()
 AND (image_leased_until IS NULL OR image_leased_until<now())
 AND pg_total_relation_size('public.rain_evaluation_images'::regclass)<33554432
 ORDER BY image_next_attempt_at LIMIT greatest(0,least(batch_size,2)) FOR UPDATE SKIP LOCKED) q
 WHERE e.id=q.id RETURNING e.*;
$$;
REVOKE ALL ON FUNCTION public.claim_rain_image_jobs(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rain_image_jobs(integer) TO service_role;
