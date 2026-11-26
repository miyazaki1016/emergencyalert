-- Avoid rewriting unchanged baseline rows while preserving atomic queue persistence.
CREATE OR REPLACE FUNCTION public.jaspic_prepare_production(p_id uuid, p_province text, p_revision bigint, p_records jsonb, p_candidates jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
 ON CONFLICT(province,record_key) DO UPDATE SET payload=excluded.payload
 WHERE jaspic_records.payload IS DISTINCT FROM excluded.payload;
 UPDATE public.jaspic_sources SET revision=revision+1,checked_at=now()
 WHERE province=p_province;
END $function$
;

-- Limit the exception to JASPIC's atomic prepare RPC.
-- PostgREST applies function settings before executing this request.
alter function public.jaspic_prepare_all_production(uuid,jsonb) set statement_timeout='30s';
notify pgrst, 'reload schema';
