-- Additive delivery safety, independent of delivered_count > 0 history.
CREATE TABLE public.rain_watch_runtime (
 target_id uuid PRIMARY KEY REFERENCES public.watch_targets(id) ON DELETE CASCADE,
 episode jsonb NOT NULL DEFAULT '{}',
 lease_id uuid, leased_until timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rain_push_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 target_id uuid NOT NULL REFERENCES public.watch_targets(id) ON DELETE CASCADE,
 event_key text NOT NULL CHECK(length(event_key) BETWEEN 1 AND 100),
 subscription_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'CLAIMED' CHECK(status IN ('CLAIMED','ACCEPTED','FAILED_TERMINAL','UNCERTAIN')),
 claimed_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,
 UNIQUE(target_id,event_key,subscription_id)
);
ALTER TABLE public.rain_watch_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rain_push_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rain_watch_runtime,public.rain_push_attempts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.rain_watch_runtime,public.rain_push_attempts TO service_role;
CREATE FUNCTION public.claim_rain_watch_target(p_target uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE token uuid:=gen_random_uuid(); taken uuid;
BEGIN
 INSERT INTO public.rain_watch_runtime(target_id) VALUES(p_target) ON CONFLICT DO NOTHING;
 UPDATE public.rain_watch_runtime SET lease_id=token,leased_until=now()+interval '2 minutes',updated_at=now()
 WHERE target_id=p_target AND (leased_until IS NULL OR leased_until<now()) RETURNING lease_id INTO taken;
 RETURN taken;
END $$;
CREATE FUNCTION public.save_rain_watch_runtime(p_target uuid,p_lease uuid,p_episode jsonb,p_watch_state jsonb DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.rain_watch_runtime WHERE target_id=p_target AND lease_id=p_lease AND leased_until>now() FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF jsonb_typeof(p_episode)<>'object' THEN RAISE EXCEPTION 'INVALID_EPISODE'; END IF;
 UPDATE public.rain_watch_runtime SET episode=p_episode,updated_at=now() WHERE target_id=p_target;
 IF p_watch_state IS NOT NULL THEN
 INSERT INTO public.watch_states(target_id,last_event,last_checked_at,last_notified_at,rain_ending_notified,clear_streak,rain_streak,rain_confirmed_notified,confirmed_weather,severe_rain_level,updated_at)
 VALUES(p_target,p_watch_state->'last_event',(p_watch_state->>'last_checked_at')::timestamptz,(p_watch_state->>'last_notified_at')::timestamptz,(p_watch_state->>'rain_ending_notified')::boolean,(p_watch_state->>'clear_streak')::smallint,(p_watch_state->>'rain_streak')::smallint,(p_watch_state->>'rain_confirmed_notified')::boolean,p_watch_state->>'confirmed_weather',(p_watch_state->>'severe_rain_level')::smallint,now())
 ON CONFLICT(target_id) DO UPDATE SET last_event=EXCLUDED.last_event,last_checked_at=EXCLUDED.last_checked_at,last_notified_at=EXCLUDED.last_notified_at,rain_ending_notified=EXCLUDED.rain_ending_notified,clear_streak=EXCLUDED.clear_streak,rain_streak=EXCLUDED.rain_streak,rain_confirmed_notified=EXCLUDED.rain_confirmed_notified,confirmed_weather=EXCLUDED.confirmed_weather,severe_rain_level=EXCLUDED.severe_rain_level,updated_at=now();
 END IF;
 RETURN true;
END $$;
CREATE FUNCTION public.release_rain_watch_target(p_target uuid,p_lease uuid) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 UPDATE public.rain_watch_runtime SET lease_id=NULL,leased_until=NULL WHERE target_id=p_target AND lease_id=p_lease;
$$;
CREATE FUNCTION public.claim_rain_push_attempt(p_target uuid,p_lease uuid,p_event text,p_subscription uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE attempt uuid;
BEGIN
 PERFORM 1 FROM public.rain_watch_runtime WHERE target_id=p_target AND lease_id=p_lease AND leased_until>now() FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 INSERT INTO public.rain_push_attempts(target_id,event_key,subscription_id) VALUES(p_target,p_event,p_subscription)
 ON CONFLICT(target_id,event_key,subscription_id) DO NOTHING RETURNING id INTO attempt;
 RETURN attempt;
END $$;
-- A late result may settle its own permanent intent; it never grants another send.
CREATE FUNCTION public.finish_rain_push_attempt(p_attempt uuid,p_status text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF p_status NOT IN ('ACCEPTED','FAILED_TERMINAL','UNCERTAIN') THEN RAISE EXCEPTION 'INVALID_PUSH_STATUS'; END IF;
 UPDATE public.rain_push_attempts SET status=p_status,finished_at=now() WHERE id=p_attempt AND status='CLAIMED';
END $$;
REVOKE ALL ON FUNCTION public.claim_rain_watch_target(uuid),public.save_rain_watch_runtime(uuid,uuid,jsonb,jsonb),public.release_rain_watch_target(uuid,uuid),public.claim_rain_push_attempt(uuid,uuid,text,uuid),public.finish_rain_push_attempt(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rain_watch_target(uuid),public.save_rain_watch_runtime(uuid,uuid,jsonb,jsonb),public.release_rain_watch_target(uuid,uuid),public.claim_rain_push_attempt(uuid,uuid,text,uuid),public.finish_rain_push_attempt(uuid,text) TO service_role;
