-- PREPARATION ONLY. Not an automatic migration; do not apply to production without approval.
begin;
create table public.jaspic_sources (
  province text primary key check (province in ('hiroshima','shiga')),
  revision bigint not null default 0,
  baseline_complete boolean not null default false,
  checked_at timestamptz
);
insert into public.jaspic_sources(province) values ('hiroshima'),('shiga');
create table public.jaspic_records (
  province text not null references public.jaspic_sources(province),
  record_key text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  primary key (province, record_key)
);
create table public.jaspic_deliveries (
  province text not null references public.jaspic_sources(province),
  record_key text not null,
  version text not null check (version ~ '^[0-9a-f]{64}$'),
  status text not null default 'DRY_RUN' check (status in ('DRY_RUN','PREPARED','SENDING','SENT','UNKNOWN','CANCELLED')),
  lease_token uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  primary key (province, record_key, version)
);
alter table public.jaspic_sources enable row level security;
alter table public.jaspic_records enable row level security;
alter table public.jaspic_deliveries enable row level security;
revoke all on public.jaspic_sources, public.jaspic_records, public.jaspic_deliveries from public, anon, authenticated;
grant select, insert, update on public.jaspic_sources, public.jaspic_records, public.jaspic_deliveries to service_role;

create function public.jaspic_snapshot(p_province text) returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object('revision', s.revision, 'baseline', s.baseline_complete,
    'records', coalesce((select jsonb_object_agg(r.record_key,r.payload) from public.jaspic_records r where r.province=s.province),'{}'::jsonb))
  from public.jaspic_sources s where s.province=p_province;
$$;

-- Serializes each province independently. CAS rejects stale plans including simultaneous baseline runs.
-- Dry-run commits are observations, never a sendable backlog. No mail bodies are stored here.
create function public.jaspic_commit_dry_run(p_province text, p_revision bigint, p_records jsonb, p_versions jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare s public.jaspic_sources; next_revision bigint;
begin
  select * into strict s from public.jaspic_sources where province=p_province for update;
  if s.revision <> p_revision then raise exception 'Stale JASPIC revision'; end if;
  if p_records is null or p_versions is null or jsonb_typeof(p_records) <> 'object' or p_records = '{}'::jsonb or jsonb_typeof(p_versions) <> 'array' then
    raise exception 'Invalid JASPIC snapshot';
  end if;
  if not s.baseline_complete and jsonb_array_length(p_versions) <> 0 then raise exception 'Baseline must be silent'; end if;
  if pg_column_size(p_records) > 16*1024*1024 or
    (pg_total_relation_size('public.jaspic_records') + pg_total_relation_size('public.jaspic_deliveries')) > 32*1024*1024 then
    raise exception 'JASPIC capacity guard';
  end if;
  if exists (select 1 from jsonb_each(p_records) r where r.key not like p_province || '-%'
    or jsonb_typeof(r.value) <> 'object' or coalesce(r.value->>'id','') = '') then raise exception 'Invalid source records'; end if;
  if exists (select 1 from jsonb_array_elements(p_versions) v where not (p_records ? (v->>'key'))
    or coalesce(v->>'version','') !~ '^[0-9a-f]{64}$') then raise exception 'Invalid source versions'; end if;
  insert into public.jaspic_records(province,record_key,payload)
    select p_province,key,value from jsonb_each(p_records)
    on conflict (province,record_key) do update set payload=excluded.payload
    where public.jaspic_records.payload is distinct from excluded.payload;
  insert into public.jaspic_deliveries(province,record_key,version,status)
    select p_province,v->>'key',v->>'version','DRY_RUN' from jsonb_array_elements(p_versions) v
    on conflict do nothing;
  update public.jaspic_sources set revision=revision+1, baseline_complete=true, checked_at=now()
    where province=p_province returning revision into next_revision;
  return next_revision;
end;
$$;
revoke all on function public.jaspic_snapshot(text), public.jaspic_commit_dry_run(text,bigint,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.jaspic_snapshot(text), public.jaspic_commit_dry_run(text,bigint,jsonb,jsonb) to service_role;

-- Prepared for later transport only. DRY_RUN rows are deliberately ineligible.
-- No function in this draft creates PREPARED deliveries, and no sender is included.
create function public.jaspic_claim(p_province text, p_key text, p_version text, p_token uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_token is null then raise exception 'Missing lease token'; end if;
  update public.jaspic_deliveries set status='SENDING',lease_token=p_token,lease_until=now()+interval '5 minutes'
    where province=p_province and record_key=p_key and version=p_version and status='PREPARED';
  return found;
end;
$$;
create function public.jaspic_finish(p_province text, p_key text, p_version text, p_token uuid, p_accepted boolean)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_accepted is null then raise exception 'Missing transport outcome'; end if;
  update public.jaspic_deliveries set status=case when p_accepted then 'SENT' else 'UNKNOWN' end,lease_until=null
    where province=p_province and record_key=p_key and version=p_version and status='SENDING' and lease_token=p_token and lease_until > now();
  return found;
end;
$$;
create function public.jaspic_expire_uncertain(p_province text)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare n bigint;
begin
  update public.jaspic_deliveries set status='UNKNOWN',lease_until=null
    where province=p_province and status='SENDING' and lease_until <= now();
  get diagnostics n = row_count; return n;
end;
$$;
revoke all on function public.jaspic_claim(text,text,text,uuid),public.jaspic_finish(text,text,text,uuid,boolean),public.jaspic_expire_uncertain(text) from public,anon,authenticated;
grant execute on function public.jaspic_claim(text,text,text,uuid),public.jaspic_finish(text,text,text,uuid,boolean),public.jaspic_expire_uncertain(text) to service_role;
commit;
