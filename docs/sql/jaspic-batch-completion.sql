-- Preserve initial run identity while existing queue resume reassigns run_id.
alter table public.jaspic_deliveries add column if not exists initial_run_id uuid;
create or replace function jaspic_monitor.set_initial_run() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then new.initial_run_id=new.run_id;
 else new.initial_run_id=coalesce(old.initial_run_id,old.run_id); end if;
 return new;
end $$;
revoke all on function jaspic_monitor.set_initial_run() from public,anon,authenticated;
create trigger jaspic_delivery_initial_run before insert or update of run_id
 on public.jaspic_deliveries for each row execute function jaspic_monitor.set_initial_run();
create index jaspic_deliveries_initial_run on public.jaspic_deliveries(initial_run_id);
create table jaspic_monitor.batch_requests(
 prior_run_id uuid primary key, request_id bigint not null, requested_at timestamptz not null
);
revoke all on jaspic_monitor.batch_requests from public,anon,authenticated,service_role;

\ir jaspic-batch-scanner.sql
