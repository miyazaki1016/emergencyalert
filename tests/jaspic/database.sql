-- Disposable database ONLY; no external requests or production credentials.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
\ir ../../docs/sql/jaspic-isolated-draft.sql
do $$
declare result bigint; v text := repeat('a',64); k text := 'hiroshima-crime:TEST'; token uuid := '00000000-0000-0000-0000-000000000001';
begin
  if has_table_privilege('anon','public.jaspic_records','SELECT') or has_table_privilege('authenticated','public.jaspic_deliveries','INSERT') then raise exception 'public access'; end if;
  if has_function_privilege('anon','public.jaspic_commit_dry_run(text,bigint,jsonb,jsonb)','EXECUTE') then raise exception 'public RPC'; end if;
  if exists(select 1 from pg_class where relname in ('jaspic_sources','jaspic_records','jaspic_deliveries') and not relrowsecurity) then raise exception 'RLS disabled'; end if;
  begin
    perform public.jaspic_commit_dry_run('hiroshima',0,'{}','[]');
    raise exception 'empty baseline accepted';
  exception when raise_exception then if SQLERRM = 'empty baseline accepted' then raise; end if; end;
  result := public.jaspic_commit_dry_run('hiroshima',0,jsonb_build_object(k,jsonb_build_object('id','TEST')),'[]');
  if result <> 1 or (select count(*) from public.jaspic_deliveries) <> 0 then raise exception 'baseline not silent'; end if;
  begin
    perform public.jaspic_commit_dry_run('hiroshima',0,jsonb_build_object(k,jsonb_build_object('id','TEST')),'[]');
    raise exception 'stale write accepted';
  exception when raise_exception then if SQLERRM = 'stale write accepted' then raise; end if; end;
  perform public.jaspic_commit_dry_run('hiroshima',1,jsonb_build_object(k,jsonb_build_object('id','TEST')),jsonb_build_array(jsonb_build_object('key',k,'version',v)));
  perform public.jaspic_commit_dry_run('hiroshima',2,jsonb_build_object(k,jsonb_build_object('id','TEST')),jsonb_build_array(jsonb_build_object('key',k,'version',v)));
  if (select count(*) from public.jaspic_deliveries) <> 1 then raise exception 'duplicate version'; end if;
  if public.jaspic_claim('hiroshima',k,v,token) then raise exception 'claimed dry-run'; end if;
  update public.jaspic_deliveries set status='PREPARED';
  if not public.jaspic_claim('hiroshima',k,v,token) then raise exception 'claim failed'; end if;
  if public.jaspic_claim('hiroshima',k,v,token) then raise exception 'double claim'; end if;
  if public.jaspic_finish('hiroshima',k,v,'00000000-0000-0000-0000-000000000002',true) then raise exception 'stolen lease'; end if;
  if not public.jaspic_finish('hiroshima',k,v,token,false) then raise exception 'unknown finish failed'; end if;
  if public.jaspic_claim('hiroshima',k,v,token) then raise exception 'unknown retry'; end if;
  update public.jaspic_deliveries set status='SENDING',lease_until=now()-interval '1 second';
  if public.jaspic_expire_uncertain('hiroshima') <> 1 then raise exception 'expiry failed'; end if;
  if public.jaspic_claim('hiroshima',k,v,token) then raise exception 'expired retry'; end if;
  if (public.jaspic_snapshot('shiga')->>'baseline')::boolean then raise exception 'province contamination'; end if;
end;
$$;
-- A legitimate service role can use the RPC, while normal clients have no API grants.
set role service_role;
select public.jaspic_snapshot('hiroshima');
reset role;
