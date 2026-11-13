-- Reclaim an expired invocation only if no Gmail attempt needs reconciliation.
CREATE OR REPLACE FUNCTION public.jaspic_begin_run(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SET search_path TO '' AS $function$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(144166021, 238);
 UPDATE public.jaspic_runs
 SET status='FAILED',finished_at=now(),error_code='RUN_INTERRUPTED'
 WHERE status='RUNNING' AND started_at < now()-interval '6 minutes'
 AND NOT EXISTS (SELECT 1 FROM public.jaspic_deliveries
                 WHERE status IN ('SENDING','UNKNOWN','FAILED'));
 INSERT INTO public.jaspic_runs(id,status) VALUES(p_id,'RUNNING') ON CONFLICT DO NOTHING;
 RETURN FOUND;
END $function$;

-- Atomic full candidate snapshot; never truncate to a 20-item send batch.
CREATE OR REPLACE FUNCTION public.jaspic_prepare_production(
 p_id uuid,p_province text,p_revision bigint,p_records jsonb,p_candidates jsonb)
RETURNS void LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE s public.jaspic_sources;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.jaspic_runs
   WHERE id=p_id AND status='RUNNING' AND started_at>now()-interval '5 minutes')
 THEN RAISE EXCEPTION 'Run unavailable'; END IF;
 SELECT * INTO STRICT s FROM public.jaspic_sources WHERE province=p_province FOR UPDATE;
 IF s.revision<>p_revision OR NOT s.baseline_complete THEN RAISE EXCEPTION 'Stale baseline'; END IF;
 IF jsonb_typeof(p_records) IS DISTINCT FROM 'object' OR p_records='{}'::jsonb
   OR jsonb_typeof(p_candidates) IS DISTINCT FROM 'array' OR jsonb_array_length(p_candidates)>1000
 THEN RAISE EXCEPTION 'Invalid plan'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_candidates)c
   WHERE NOT(p_records ? (c->>'key'))
   OR c->>'key' IS NULL OR c->>'version' IS NULL
   OR (c->>'version') !~ '^[0-9a-f]{64}$'
   OR c->'mail'->>'to' IS DISTINCT FROM 'getter01@jaspic-nes.net'
   OR c->'mail'->>'from' IS DISTINCT FROM 'miyazaki1016@gmail.com'
   OR c->'mail'->>'cc' IS NOT NULL)
 THEN RAISE EXCEPTION 'Invalid mail'; END IF;
 IF EXISTS(SELECT 1 FROM public.jaspic_deliveries
   WHERE status IN ('SENDING','UNKNOWN','FAILED')
   AND run_id IS DISTINCT FROM p_id)
 THEN RAISE EXCEPTION 'Unresolved delivery'; END IF;
 -- Prevent duplicate keys inside the same plan and inconsistent silently skipped rows.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_candidates)c
   GROUP BY c->>'key',c->>'version' HAVING count(*)>1)
 THEN RAISE EXCEPTION 'Duplicate candidate'; END IF;
 INSERT INTO public.jaspic_deliveries(province,record_key,version,status,mail,run_id)
 SELECT p_province,c->>'key',c->>'version','PREPARED',c->'mail',p_id
 FROM jsonb_array_elements(p_candidates)c ON CONFLICT DO NOTHING;
 -- Existing SENT versions are idempotent, but any conflict with a non-SENT
 -- version from another run must not silently advance the baseline.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_candidates)c
   JOIN public.jaspic_deliveries d
   ON d.province=p_province AND d.record_key=c->>'key' AND d.version=c->>'version'
   WHERE d.run_id IS DISTINCT FROM p_id AND d.status<>'SENT')
 THEN RAISE EXCEPTION 'Conflicting delivery'; END IF;
 INSERT INTO public.jaspic_records(province,record_key,payload)
 SELECT p_province,key,value FROM jsonb_each(p_records)
 ON CONFLICT(province,record_key) DO UPDATE SET payload=excluded.payload;
 UPDATE public.jaspic_sources SET revision=revision+1,checked_at=now()
 WHERE province=p_province;
END $function$;

-- Only a completely unattempted PREPARED queue can be attached to a new run.
-- A prior run may have SENT items; these are never reclaimed.
-- No SENDING/UNKNOWN/FAILED is automatically retried.
CREATE OR REPLACE FUNCTION public.jaspic_resume_prepared(p_id uuid)
RETURNS integer LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE n integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.jaspic_runs
   WHERE id=p_id AND status='RUNNING' AND started_at>now()-interval '5 minutes')
 THEN RAISE EXCEPTION 'Run unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.jaspic_deliveries
   WHERE status IN ('SENDING','UNKNOWN','FAILED'))
 THEN RAISE EXCEPTION 'Manual delivery review required'; END IF;
 -- PREPARED messages remain immutable; only run ownership changes.
 UPDATE public.jaspic_deliveries SET run_id=p_id
 WHERE status='PREPARED' AND run_id IS DISTINCT FROM p_id;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n;
END $function$;

REVOKE ALL ON FUNCTION public.jaspic_resume_prepared(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jaspic_resume_prepared(uuid) TO service_role;

-- Both provinces are committed or rolled back in the same database transaction.
-- Each province's revision is checked inside jaspic_prepare_production.
CREATE OR REPLACE FUNCTION public.jaspic_prepare_all_production(p_id uuid,p_plans jsonb)
RETURNS void LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE entry jsonb;
BEGIN
 IF jsonb_typeof(p_plans) IS DISTINCT FROM 'array' OR jsonb_array_length(p_plans)<>2
 THEN RAISE EXCEPTION 'Invalid province plans'; END IF;
 IF (SELECT count(DISTINCT x->>'province') FROM jsonb_array_elements(p_plans)x
       WHERE x->>'province' IN ('hiroshima','shiga'))<>2
 THEN RAISE EXCEPTION 'Missing or repeated province'; END IF;
 -- Fixed province order prevents lock-order inversion.
 FOR entry IN SELECT x FROM jsonb_array_elements(p_plans)x ORDER BY x->>'province'
 LOOP
  PERFORM public.jaspic_prepare_production(
   p_id,entry->>'province',(entry->>'revision')::bigint,
   entry->'records',entry->'candidates');
 END LOOP;
END $function$;

REVOKE ALL ON FUNCTION public.jaspic_prepare_all_production(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jaspic_prepare_all_production(uuid,jsonb) TO service_role;
