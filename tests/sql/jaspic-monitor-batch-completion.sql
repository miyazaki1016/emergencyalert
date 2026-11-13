create table public.jaspic_deliveries(
 province text, status text, gmail_message_id text, run_id uuid
);
\ir ../../docs/sql/jaspic-batch-completion.sql
truncate jaspic_monitor.alerts,net.requests,public.jaspic_runs,cron.job_run_details;
insert into vault.decrypted_secrets values('jaspic_production_dispatch_token','test-only') on conflict do nothing;
insert into cron.job_run_details values(5,'succeeded','2026-11-14T09:00Z');
insert into public.jaspic_runs values
 ('00000000-0000-0000-0000-000000000030','2026-11-14T09:00:01Z','2026-11-14T09:01Z','SUCCEEDED','{"sent":{"hiroshima":20,"shiga":0},"remainingPrepared":14}',null);
insert into public.jaspic_deliveries(province,status,gmail_message_id,run_id)
select case when n<=31 then 'hiroshima' else 'shiga' end,
 case when n<=20 then 'SENT' else 'PREPARED' end,
 case when n<=20 then n::text end,'00000000-0000-0000-0000-000000000030'
 from generate_series(1,34)n;
select jaspic_monitor.scan_completions('2026-11-14T09:05Z');
select jaspic_monitor.scan_completions('2026-11-14T09:06Z');
do $$begin
 if exists(select 1 from jaspic_monitor.alerts) then raise exception 'premature completion'; end if;
 if (select count(*) from net.requests where url like '%/dispatch')<>1 then raise exception 'continuation must enqueue once'; end if;
end $$;
update public.jaspic_deliveries set status='UNKNOWN' where province='shiga';
select jaspic_monitor.scan_completions('2026-11-14T09:07Z');
do $$begin
 if not exists(select 1 from jaspic_monitor.alerts where code='DISPATCH_BATCH_STOPPED' and message like '%結果不明: 3 件%') then raise exception 'uncertain count missing'; end if;
 if exists(select 1 from jaspic_monitor.alerts where code='DISPATCH_SUCCEEDED') then raise exception 'uncertain batch marked complete'; end if;
end $$;
insert into public.jaspic_runs values
 ('00000000-0000-0000-0000-000000000031','2026-11-14T09:08Z','2026-11-14T09:09Z','SUCCEEDED','{"sent":{"hiroshima":11,"shiga":3},"remainingPrepared":0,"resuming":true}',null);
update public.jaspic_deliveries set status='SENT',gmail_message_id='confirmed',
 run_id='00000000-0000-0000-0000-000000000031' where status<>'SENT';
select jaspic_monitor.scan_completions('2026-11-14T09:10Z');
select jaspic_monitor.scan_completions('2026-11-14T09:15Z');
do $$begin
 if (select count(*) from jaspic_monitor.alerts where code='DISPATCH_SUCCEEDED' and message like '%広島県: 31 件%' and message like '%滋賀県: 3 件%' and message like '%合計: 34 件%' and message like '%未送信: 0 件%')<>1 then raise exception 'whole queue completion missing'; end if;
end $$;
