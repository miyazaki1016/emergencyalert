-- Run in a NEW disposable database: psql -v ON_ERROR_STOP=1 -f tests/sql/jaspic-monitor-integration.sql
\ir jaspic-monitor-setup.sql
\ir ../../docs/sql/jaspic-admin-monitor.sql

do $$
declare original_expiry timestamptz; x timestamptz;
begin
 if (select refresh_expires_at from public.jaspic_gmail_token_vault)<>'2026-11-15T07:35:49.513Z'::timestamptz then raise exception 'legacy estimate'; end if;
 select refresh_expires_at into original_expiry from public.jaspic_gmail_token_vault;
 update public.jaspic_gmail_token_vault set updated_at=now();
 if (select refresh_expires_at from public.jaspic_gmail_token_vault)<>original_expiry then raise exception 'metadata update extended expiry'; end if;
 update public.jaspic_gmail_token_vault set encrypted_refresh_token='{"synthetic":"two"}';
 select refresh_expires_at into x from public.jaspic_gmail_token_vault;
 if abs(extract(epoch from (x-now()-interval '7 days')))>5 then raise exception 'reauth expiry not renewed'; end if;
end $$;

grant select,update on public.jaspic_gmail_token_vault to service_role;
set role service_role;
update public.jaspic_gmail_token_vault set encrypted_refresh_token='{"synthetic":"service-role-save"}';
reset role;
-- Fixed-time scan tests (no sending).
alter table public.jaspic_gmail_token_vault disable trigger jaspic_record_authorization;
update public.jaspic_gmail_token_vault set authorized_at='2026-11-03T10:00Z',refresh_expires_at='2026-11-10T10:00Z';
alter table public.jaspic_gmail_token_vault enable trigger jaspic_record_authorization;
update jaspic_monitor.config set activated_at='2026-11-10T00:00Z';
select jaspic_monitor.scan('2026-11-09T09:59Z');
do $$begin if exists(select 1 from jaspic_monitor.alerts) then raise exception 'early warning'; end if; end $$;
select jaspic_monitor.scan('2026-11-09T10:00Z');
select jaspic_monitor.scan('2026-11-10T10:01Z');
do $$begin
 if (select count(*) from jaspic_monitor.alerts where category='Google再認証')<>1 then raise exception 'duplicate expiry warning'; end if;
 if not exists(select 1 from jaspic_monitor.alerts where category='18時自動実行未起動') then raise exception 'missing run not detected'; end if;
 if not exists(select 1 from jaspic_monitor.alerts where message like '%https://emergencyalert.news/jaspic/oauth%') then raise exception 'missing reauth URL'; end if;
end $$;
update public.jaspic_gmail_token_vault set encrypted_refresh_token='{"synthetic":"three"}';
select jaspic_monitor.scan('2026-11-10T10:01Z');
do $$begin if not exists(select 1 from jaspic_monitor.alerts where category='Google再認証' and status='CANCELLED') then raise exception 'stale warning'; end if; end $$;

insert into public.jaspic_runs values
 ('00000000-0000-0000-0000-000000000001','2026-11-10T09:00:01Z',null,'FAILED','{"sent":{"hiroshima":0,"shiga":0},"stage":"source-preflight","sourceErrors":[{"province":"hiroshima","code":"SOURCE_FETCH_FAILED"},{"province":"shiga","code":"SOURCE_FETCH_FAILED"}]}','SOURCE_FETCH_FAILED'),
 ('00000000-0000-0000-0000-000000000002','2026-11-10T09:01:01Z',null,'FAILED','{"sent":{"hiroshima":0,"shiga":0},"stage":"gmail-auth"}','GMAIL_REFRESH_FAILED'),
 ('00000000-0000-0000-0000-000000000003','2026-11-10T09:02:01Z',null,'FAILED','{"sent":{"hiroshima":2,"shiga":0},"stage":"gmail-send","province":"hiroshima"}','GMAIL_HTTP_403'),
 ('00000000-0000-0000-0000-000000000004','2026-11-10T09:03:01Z',null,'FAILED','{"sent":{"hiroshima":0,"shiga":0},"stage":"gmail-send","province":"shiga"}','GMAIL_RESULT_UNCERTAIN'),
 ('00000000-0000-0000-0000-000000000005','2026-11-10T09:04:01Z',null,'RUNNING',null,null);
insert into cron.job values(5,'jaspic-production-1800-jst','0 9 * * *',true);
insert into cron.job_run_details values(5,'succeeded','2026-11-10T09:00Z');
delete from jaspic_monitor.alerts where category='18時自動実行未起動';
select jaspic_monitor.scan('2026-11-10T10:01Z');
select jaspic_monitor.scan('2026-11-10T10:02Z');
do $$begin
 if (select count(*) from jaspic_monitor.alerts where category='県データ取得失敗')<>2 then raise exception 'source errors'; end if;
 if (select count(*) from jaspic_monitor.alerts where category in ('Gmail認証失敗','Gmail送信失敗','一部メール送信失敗','処理未完了'))<>4 then raise exception 'failure classification'; end if;
 if exists(select 1 from jaspic_monitor.alerts where category='18時自動実行未起動') then raise exception 'false missing-run'; end if;
 if has_schema_privilege('anon','jaspic_monitor','USAGE') or has_function_privilege('authenticated','jaspic_monitor.tick()','EXECUTE') then raise exception 'public monitor access'; end if;
 if has_schema_privilege('service_role','jaspic_monitor','USAGE') then raise exception 'service monitor access'; end if;
 if has_table_privilege('anon','jaspic_monitor.alerts','SELECT') then raise exception 'public alert access'; end if;
end $$;

-- pg_net is a local fake. Disabled/missing provider never sends.
select jaspic_monitor.tick();
do $$begin if exists(select 1 from net.requests) then raise exception 'disabled send'; end if; end $$;
update jaspic_monitor.config set enabled=true,recipient='admin@example.com',sender='monitor@example.com',activated_at=now()+interval '1 day';
select jaspic_monitor.tick();
do $$begin if exists(select 1 from net.requests) then raise exception 'unconfigured provider send'; end if; end $$;
insert into vault.decrypted_secrets values('jaspic_monitor_resend_api_key','synthetic-not-a-key');
select jaspic_monitor.tick();
do $$begin if (select count(*) from net.requests)<>5 then raise exception 'batch cap'; end if; end $$;
select jaspic_monitor.tick();
do $$begin
 if exists(select 1 from net.requests group by headers->>'Idempotency-Key' having count(*)>1) then raise exception 'overlapping resend'; end if;
 if exists(select 1 from net.requests where url<>'https://api.resend.com/emails' or not(headers ? 'Idempotency-Key')) then raise exception 'provider endpoint/idempotency'; end if;
end $$;
-- Success must contain an acceptance id; a 2xx empty body is uncertain.
insert into net._http_response select min(id),200,'{"id":"synthetic_accepted"}' from net.requests;
insert into net._http_response select max(id),200,'{}' from net.requests;
select jaspic_monitor.tick();
do $$begin
 if (select count(*) from jaspic_monitor.alerts where status='SENT')<>1 then raise exception 'provider acceptance'; end if;
 if not exists(select 1 from jaspic_monitor.alerts where error_code='MAIL_API_NOT_CONFIRMED' and status='PENDING') then raise exception 'uncertain 2xx accepted'; end if;
end $$;
-- Force retry and check the body and key remain identical even if settings change.
update jaspic_monitor.config set recipient='newadmin@example.com';
update jaspic_monitor.alerts set next_attempt_at=now()-interval '1 minute' where error_code='MAIL_API_NOT_CONFIRMED';
select jaspic_monitor.tick();
do $$begin
 if not exists(select 1 from net.requests group by headers->>'Idempotency-Key',body having count(*)=2) then raise exception 'retry changed body/key'; end if;
end $$;
-- A third ambiguous result is terminal, with no fourth attempt.
update jaspic_monitor.alerts set attempts=3 where status='SENDING' and request_id=(select max(id) from net.requests);
insert into net._http_response select max(id),503,'{}' from net.requests;
select jaspic_monitor.tick();
do $$begin if not exists(select 1 from jaspic_monitor.alerts where attempts=3 and status='FAILED') then raise exception 'unbounded retries'; end if; end $$;
-- Lost replies never get a new send after the idempotency window.
update jaspic_monitor.alerts set status='PENDING',first_attempt_at=now()-interval '24 hours',next_attempt_at=now() where status<>'SENT';
select jaspic_monitor.tick();
do $$begin if exists(select 1 from jaspic_monitor.alerts where status in ('PENDING','SENDING')) then raise exception 'expired replay'; end if; end $$;
-- Hard daily cap survives multiple ticks.
insert into jaspic_monitor.alerts(event_key,category,target,code,occurred_at,subject,message,status,first_attempt_at)
select 'cap-used-'||n,'test','monitor','TEST',now(),'test','test','SENT',now() from generate_series(1,12)n;
select jaspic_monitor.enqueue('cap-pending','test','monitor','TEST',now(),'test');
select jaspic_monitor.tick();
do $$begin if not exists(select 1 from jaspic_monitor.alerts where event_key='cap-pending' and attempts=0) then raise exception 'daily cap exceeded'; end if; end $$;
select 'JASPIC monitor integration assertions passed' as result;
