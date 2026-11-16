-- Apply as the existing monitor owner, after jaspic-batch-completion has been installed.
-- This transaction installs definitions only. It does not schedule or enable any job.
begin;
\ir jaspic-alert-sender.sql
\ir jaspic-batch-scanner.sql

create or replace function jaspic_monitor.run_scheduled_delivery(p_root uuid, p_now timestamptz default now())
returns void language plpgsql set search_path='' as $$
declare r public.jaspic_runs; day_key text; alert_key text; alert_status text; alert_created timestamptz;
begin
 select * into strict r from public.jaspic_runs where id=p_root;
 day_key=to_char(r.started_at at time zone 'Asia/Tokyo','YYYY-MM-DD');

 -- Keep notification updates serialized with the shared sender.
 -- One batch request per prior run. An unknown HTTP result is never replayed.
 if not exists(select 1 from jaspic_monitor.alerts where event_key in
     ('completion:'||day_key,'batch-stopped:'||day_key,'completion-invalid:'||day_key))
    and p_now<r.started_at+interval '23 hours' then
  if r.status='RUNNING' and p_now>=r.started_at+interval '10 minutes' then
   perform jaspic_monitor.enqueue('batch-stopped:'||day_key,'分割配信停止','jaspic/dispatch',
    'DISPATCH_BATCH_STOPPED',p_now,'18時の配信が処理中のまま停止しました。実行ID: '||p_root||
    jaspic_monitor.gmail_auth_detail(null));
  else
   perform jaspic_monitor.scan_batch_completions(p_now,p_root);
  end if;
 end if;
 select event_key,status,created_at into alert_key,alert_status,alert_created
 from jaspic_monitor.alerts where event_key in
  ('completion:'||day_key,'batch-stopped:'||day_key,'completion-invalid:'||day_key)
 order by (event_key='completion:'||day_key) desc, created_at desc limit 1;
 if alert_status in ('PENDING','SENDING') and pg_try_advisory_xact_lock(731908424) then
  perform jaspic_monitor.send_alerts(alert_key);
  select status into alert_status from jaspic_monitor.alerts where event_key=alert_key;
  if alert_status in ('PENDING','SENDING') and p_now>=alert_created+interval '1 hour' then
   update jaspic_monitor.alerts set status='FAILED',error_code='COMPLETION_NOTIFICATION_TIMEOUT'
    where event_key=alert_key and status in ('PENDING','SENDING');
   alert_status='FAILED';
  end if;
 end if;
 if alert_status not in ('PENDING','SENDING') or (alert_key is null and p_now>=r.started_at+interval '23 hours') then
  perform cron.unschedule('jaspic-delivery-'||p_root::text);
 end if;
end $$;

create or replace function jaspic_monitor.start_scheduled_delivery_worker() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 -- The scheduled identity and its worker are registered in one transaction.
 if new.status='RUNNING' and old.result->>'scheduledDay' is null
    and new.result->>'scheduledDay'=to_char(new.started_at at time zone 'Asia/Tokyo','YYYY-MM-DD') then
  perform cron.schedule('jaspic-delivery-'||new.id::text,'* * * * *',
   format('select jaspic_monitor.run_scheduled_delivery(%L::uuid)',new.id));
 end if;
 return new;
end $$;

-- Attach this to the EXISTING 18:00 job only during the separately approved cutover.
create or replace function jaspic_monitor.dispatch_scheduled_1800() returns void
language plpgsql set search_path='' as $$
declare dispatch_token text;
begin
 select decrypted_secret into dispatch_token from vault.decrypted_secrets where name='jaspic_production_dispatch_token';
 if nullif(dispatch_token,'') is null then raise exception 'JASPIC dispatch credential missing'; end if;
 perform net.http_post(url:='https://emergencyalert.news/jaspic/dispatch',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||dispatch_token,
   'X-JASPIC-Trigger','scheduled-1800'),
  body:='{}'::jsonb,timeout_milliseconds:=300000);
end $$;

revoke all on function jaspic_monitor.run_scheduled_delivery(uuid,timestamptz),
 jaspic_monitor.start_scheduled_delivery_worker(),jaspic_monitor.dispatch_scheduled_1800() from public,anon,authenticated,service_role;
create trigger jaspic_start_scheduled_delivery_worker after update of result on public.jaspic_runs
 for each row execute function jaspic_monitor.start_scheduled_delivery_worker();
commit;
