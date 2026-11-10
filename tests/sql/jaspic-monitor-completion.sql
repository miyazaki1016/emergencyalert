-- Included after the existing monitor regression tests; never use in production.
\ir ../../docs/sql/jaspic-completion-notification.sql
truncate jaspic_monitor.alerts,net.requests,net._http_response,public.jaspic_runs,cron.job_run_details;
update jaspic_monitor.config set enabled=true,activated_at='2026-11-10T00:00Z',recipient='admin@example.com',sender='monitor@example.com';
insert into cron.job_run_details values(5,'succeeded','2026-11-10T09:00:00Z'),(5,'succeeded','2026-11-11T09:00:00Z'),(5,'succeeded','2026-11-12T09:00:00Z');
insert into public.jaspic_runs values
 ('00000000-0000-0000-0000-000000000010','2026-11-10T09:00:01Z','2026-11-10T09:02Z','SUCCEEDED','{"sent":{"hiroshima":2,"shiga":3}}',null),
 ('00000000-0000-0000-0000-000000000011','2026-11-11T09:00:01Z','2026-11-11T09:00:30Z','SUCCEEDED','{"sent":{"hiroshima":0,"shiga":0}}',null),
 -- Repeated manual run in the scheduled window must not create a second daily summary.
 ('00000000-0000-0000-0000-000000000012','2026-11-11T09:03Z','2026-11-11T09:04Z','SUCCEEDED','{"sent":{"hiroshima":0,"shiga":0}}',null),
 -- Manual/off-schedule, partial failure and unfinished runs are not successes.
 ('00000000-0000-0000-0000-000000000013','2026-11-10T07:00Z','2026-11-10T07:01Z','SUCCEEDED','{"sent":{"hiroshima":0,"shiga":0}}',null),
 ('00000000-0000-0000-0000-000000000014','2026-11-12T09:00:01Z','2026-11-12T09:01Z','FAILED','{"sent":{"hiroshima":1,"shiga":0}}','GMAIL_HTTP_403'),
 ('00000000-0000-0000-0000-000000000015','2026-11-12T09:01Z',null,'RUNNING',null,null);
select jaspic_monitor.scan_completions('2026-11-10T09:01Z');
do $$begin if exists(select 1 from jaspic_monitor.alerts) then raise exception 'notification before completion'; end if; end $$;
select jaspic_monitor.scan_completions('2026-11-10T09:05Z');
select jaspic_monitor.scan_completions('2026-11-11T09:05Z');
select jaspic_monitor.scan_completions('2026-11-12T09:05Z');
select jaspic_monitor.scan_completions('2026-11-12T09:10Z');
do $$begin
 if (select count(*) from jaspic_monitor.alerts where category='配信完了')<>2 then raise exception 'daily completion deduplication'; end if;
 if not exists(select 1 from jaspic_monitor.alerts where event_key='completion:2026-11-10' and message like '%広島県: 2 件%' and message like '%滋賀県: 3 件%' and message like '%合計: 5 件%' and message like '%処理完了（日本時間）: 2026-11-10 18:02:00%') then raise exception 'wrong completion counts/time'; end if;
 if not exists(select 1 from jaspic_monitor.alerts where event_key='completion:2026-11-11' and message like '%合計: 0 件%' and message like '%両県の確認処理は正常に完了%') then raise exception 'missing zero-item heartbeat'; end if;
 if exists(select 1 from jaspic_monitor.alerts where event_key='completion:2026-11-12') then raise exception 'failed run reported as success'; end if;
 if has_function_privilege('anon','jaspic_monitor.scan_completions(timestamptz)','EXECUTE') or has_function_privilege('service_role','jaspic_monitor.completion_tick()','EXECUTE') then raise exception 'private function exposed'; end if;
end $$;

-- Disabled monitoring, missing counts, absent cron evidence and old results.
truncate jaspic_monitor.alerts;
update jaspic_monitor.config set enabled=false;
select jaspic_monitor.scan_completions('2026-11-11T09:05Z');
do $$begin if exists(select 1 from jaspic_monitor.alerts) then raise exception 'disabled completion scan'; end if; end $$;
update jaspic_monitor.config set enabled=true;
insert into public.jaspic_runs values
 ('00000000-0000-0000-0000-000000000016','2026-11-12T09:02Z','2026-11-12T09:03Z','SUCCEEDED','{"sent":{"hiroshima":0}}',null);
select jaspic_monitor.scan_completions('2026-11-12T09:05Z');
do $$begin
 if exists(select 1 from jaspic_monitor.alerts where event_key='completion:2026-11-12') then raise exception 'missing count became zero'; end if;
 if not exists(select 1 from jaspic_monitor.alerts where code='COMPLETION_RESULT_INVALID') then raise exception 'malformed success not detected'; end if;
end $$;
truncate jaspic_monitor.alerts;
select jaspic_monitor.scan_completions('2026-11-20T09:05Z');
do $$begin if exists(select 1 from jaspic_monitor.alerts) then raise exception 'historical backfill'; end if; end $$;
truncate cron.job_run_details;
select jaspic_monitor.scan_completions('2026-11-11T09:05Z');
do $$begin if exists(select 1 from jaspic_monitor.alerts) then raise exception 'manual run without cron evidence'; end if; end $$;

-- Summary-scanner failures must not stop the existing sender; never leak SQL errors.
create or replace function jaspic_monitor.scan_completions(p_now timestamptz default now()) returns void
language plpgsql set search_path='' as $$begin raise exception 'sensitive exception text'; end $$;
select jaspic_monitor.completion_tick();
do $$begin
 if not exists(select 1 from jaspic_monitor.alerts where code='COMPLETION_SCAN_FAILED' and status='SENDING') then raise exception 'existing sender stopped'; end if;
 if exists(select 1 from jaspic_monitor.alerts where message like '%sensitive exception text%') then raise exception 'exception leaked'; end if;
end $$;
select 'JASPIC completion notification assertions passed' as result;
