-- Reuses the existing baseline and delivery identity. No baseline reset or backfill.
create table public.jaspic_runs (
 id uuid primary key, started_at timestamptz not null default now(),
 finished_at timestamptz, status text not null check(status in ('RUNNING','SUCCEEDED','FAILED')),
 result jsonb, error_code text
);
alter table public.jaspic_runs enable row level security;
revoke all on public.jaspic_runs from public,anon,authenticated;
grant all on public.jaspic_runs to service_role;
create unique index jaspic_one_running on public.jaspic_runs ((status)) where status='RUNNING';
alter table public.jaspic_deliveries add column mail jsonb,
 add column gmail_message_id text, add column finished_at timestamptz,
 add column error_code text, add column run_id uuid references public.jaspic_runs(id);
alter table public.jaspic_deliveries drop constraint jaspic_deliveries_status_check;
alter table public.jaspic_deliveries add constraint jaspic_deliveries_status_check
 check(status in ('DRY_RUN','PREPARED','SENDING','SENT','UNKNOWN','CANCELLED','FAILED'));

create function public.jaspic_begin_run(p_id uuid) returns boolean language plpgsql set search_path='' as $$
begin
 -- An interrupted run is never silently reclaimed; review is required.
 insert into public.jaspic_runs(id,status) values(p_id,'RUNNING') on conflict do nothing;
 return found;
end $$;

create function public.jaspic_prepare_production(p_id uuid,p_province text,p_revision bigint,p_records jsonb,p_candidates jsonb)
returns void language plpgsql set search_path='' as $$
declare s public.jaspic_sources;
begin
 if not exists(select 1 from public.jaspic_runs where id=p_id and status='RUNNING' and started_at > now()-interval '5 minutes') then raise exception 'Run unavailable'; end if;
 select * into strict s from public.jaspic_sources where province=p_province for update;
 if s.revision<>p_revision or not s.baseline_complete then raise exception 'Stale baseline'; end if;
 if jsonb_typeof(p_records)<>'object' or p_records='{}'::jsonb or jsonb_typeof(p_candidates)<>'array'
 or jsonb_array_length(p_candidates)>20 then raise exception 'Invalid plan'; end if;
 if exists(select 1 from jsonb_array_elements(p_candidates)c where not(p_records ? (c->>'key'))
 or (c->>'version') !~ '^[0-9a-f]{64}$'
 or c->'mail'->>'to'<>'getter01@jaspic-nes.net'
 or c->'mail'->>'from'<>'miyazaki1016@gmail.com'
 or c->'mail'->>'cc' is not null) then raise exception 'Invalid mail'; end if;
 if exists(select 1 from public.jaspic_deliveries where status in ('PREPARED','SENDING','UNKNOWN','FAILED') and run_id is distinct from p_id) then raise exception 'Unresolved delivery'; end if;
 insert into public.jaspic_deliveries(province,record_key,version,status,mail,run_id)
 select p_province,c->>'key',c->>'version','PREPARED',c->'mail',p_id from jsonb_array_elements(p_candidates)c
 on conflict do nothing;
 -- Only current snapshots are observed; existing historical tombstones remain.
 insert into public.jaspic_records(province,record_key,payload)
 select p_province,key,value from jsonb_each(p_records)
 on conflict(province,record_key) do update set payload=excluded.payload;
 update public.jaspic_sources set revision=revision+1,checked_at=now() where province=p_province;
end $$;

create function public.jaspic_finish_production(p_id uuid,p_province text,p_key text,p_version text,p_token uuid,p_status text,p_message text,p_error text)
returns boolean language plpgsql set search_path='' as $$
begin
 if p_status not in ('SENT','UNKNOWN','FAILED') or (p_status='SENT' and coalesce(p_message,'')='') then raise exception 'Invalid outcome'; end if;
 update public.jaspic_deliveries set status=p_status,gmail_message_id=p_message,error_code=p_error,finished_at=now(),lease_until=null
 where province=p_province and record_key=p_key and version=p_version and run_id=p_id and status='SENDING' and lease_token=p_token;
 return found;
end $$;
revoke all on function public.jaspic_begin_run(uuid),public.jaspic_prepare_production(uuid,text,bigint,jsonb,jsonb),public.jaspic_finish_production(uuid,text,text,text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.jaspic_begin_run(uuid),public.jaspic_prepare_production(uuid,text,bigint,jsonb,jsonb),public.jaspic_finish_production(uuid,text,text,text,uuid,text,text,text) to service_role;
