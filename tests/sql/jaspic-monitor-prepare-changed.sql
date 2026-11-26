-- Isolated fixture. Never run against production.
create table public.jaspic_sources(province text primary key,revision bigint,baseline_complete boolean,checked_at timestamptz);
create table public.jaspic_records(province text,record_key text,payload jsonb,primary key(province,record_key));
create table public.jaspic_deliveries(province text,record_key text,version text,status text check(status in ('PREPARED')),lease_token uuid,lease_until timestamptz,primary key(province,record_key,version));
\ir ../../docs/sql/jaspic-production-delivery.sql
\ir ../../supabase/migrations/20261114000000_jaspic_lossless_queue_draft.sql
\ir ../../docs/sql/jaspic-prepare-changed-records.sql

create table record_updates(record_key text);
create function count_record_update() returns trigger language plpgsql as $$
begin insert into public.record_updates values(new.record_key); return new; end $$;
create trigger count_updates after update on public.jaspic_records for each row execute function count_record_update();
insert into public.jaspic_sources values('hiroshima',20,true,now()),('shiga',20,true,now());
insert into public.jaspic_records
select 'hiroshima','hiroshima-crime:'||n,jsonb_build_object('id',n,'body',repeat('data',80)) from generate_series(1,7000)n;
insert into public.jaspic_records values('shiga','shiga-person:1','{"id":1}');
insert into public.jaspic_runs(id,status) values('00000000-0000-4000-8000-000000000308','RUNNING');
create temp table plans as
select jsonb_agg(jsonb_build_object('province',s.province,'revision',s.revision,
 'records',(select jsonb_object_agg(record_key,payload) from public.jaspic_records r where r.province=s.province),
 'candidates','[]'::jsonb)) value from public.jaspic_sources s;
set statement_timeout='8s';
select public.jaspic_prepare_all_production('00000000-0000-4000-8000-000000000308',(select value from plans));
do $$begin
 if exists(select 1 from record_updates) then raise exception 'unchanged rows rewritten'; end if;
 if exists(select 1 from public.jaspic_sources where revision<>21) then raise exception 'revision not advanced'; end if;
end $$;
do $$
declare snapshot jsonb; batch jsonb; before_revision bigint;
begin
 select jsonb_object_agg(record_key,payload) into snapshot from public.jaspic_records where province='hiroshima';
 snapshot=jsonb_set(snapshot,'{hiroshima-crime:1,body}','"changed"');
 snapshot=snapshot||jsonb_build_object('hiroshima-crime:new',jsonb_build_object('id','new'));
 select jsonb_agg(jsonb_build_object('key',key,'version',repeat('a',64),
  'mail',jsonb_build_object('to','getter01@jaspic-nes.net','from','miyazaki1016@gmail.com')))
 into batch from jsonb_object_keys(snapshot) key where key='hiroshima-crime:new';
 perform public.jaspic_prepare_production('00000000-0000-4000-8000-000000000308','hiroshima',21,snapshot,batch);
 if (select count(*) from record_updates)<>1 then raise exception 'changed row was not updated exactly once'; end if;
 if (select count(*) from public.jaspic_deliveries where status='PREPARED')<>1 then raise exception 'candidate lost'; end if;
 -- A failure in the second province must roll back the first province too.
 before_revision=(select revision from public.jaspic_sources where province='hiroshima');
 begin
  perform public.jaspic_prepare_all_production('00000000-0000-4000-8000-000000000308',
   jsonb_build_array(jsonb_build_object('province','hiroshima','revision',22,'records',snapshot,'candidates','[]'::jsonb),
    jsonb_build_object('province','shiga','revision',999,'records','{"shiga-person:1":{"id":1}}'::jsonb,'candidates','[]'::jsonb)));
  raise exception 'stale second province accepted';
 exception when raise_exception then
  if sqlerrm<>'Stale baseline' then raise; end if;
 end;
 if (select revision from public.jaspic_sources where province='hiroshima')<>before_revision then raise exception 'partial commit'; end if;
end $$;
select 'unchanged, changed, new, queue and atomic rollback assertions passed';

do $$begin
 if not exists(select 1 from pg_proc where oid='public.jaspic_prepare_all_production(uuid,jsonb)'::regprocedure
 and proconfig @> array['statement_timeout=30s']) then raise exception 'bounded RPC timeout missing'; end if;
end $$;
