create or replace function jaspic_monitor.send_alerts(p_event_key text) returns void
language plpgsql set search_path='' as $$
declare c jaspic_monitor.config; a record; h record; provider_key text; n integer; accepted_id text;
begin
 -- Serializes overlapping cron/manual ticks before scanning or reserving sends.
 if not pg_try_advisory_xact_lock(731908424) then return; end if;
 select * into strict c from jaspic_monitor.config where id;
 if not c.enabled then return; end if;
 for a in select * from jaspic_monitor.alerts where status='SENDING' and (p_event_key is null or event_key=p_event_key) loop
  select * into h from net._http_response where id=a.request_id;
  if found then
   accepted_id=null;
   if h.status_code between 200 and 299 then
    begin accepted_id=h.content::jsonb->>'id'; exception when others then accepted_id=null; end;
   end if;
   if accepted_id ~ '^[A-Za-z0-9_-]{1,100}$' then
    update jaspic_monitor.alerts set status='SENT',sent_at=now(),provider_id=accepted_id,error_code=null where event_key=a.event_key;
   elsif a.attempts>=3 then
    update jaspic_monitor.alerts set status='FAILED',error_code='MAIL_API_NOT_CONFIRMED' where event_key=a.event_key;
   else
    update jaspic_monitor.alerts set status='PENDING',next_attempt_at=now()+interval '15 minutes',error_code='MAIL_API_NOT_CONFIRMED' where event_key=a.event_key;
   end if;
  elsif a.last_attempt_at<now()-interval '5 minutes' then
   update jaspic_monitor.alerts set status=case when attempts>=3 then 'FAILED' else 'PENDING' end,
    next_attempt_at=now()+interval '15 minutes',error_code='MAIL_API_RESPONSE_MISSING' where event_key=a.event_key;
  end if;
 end loop;
 -- Never replay outside the provider's 24h idempotency window.
 update jaspic_monitor.alerts set status='EXPIRED',error_code='IDEMPOTENCY_WINDOW_EXPIRED'
 where status='PENDING' and (p_event_key is null or event_key=p_event_key) and first_attempt_at<now()-interval '23 hours';
 select decrypted_secret into provider_key from vault.decrypted_secrets where name='jaspic_monitor_resend_api_key';
 if provider_key is null or provider_key='' then return; end if;
 -- Hard daily cap on distinct alerts, regardless of repeated/manual ticks.
 select count(*) into n from jaspic_monitor.alerts where first_attempt_at >=
  (date_trunc('day',now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo');
 for a in select * from jaspic_monitor.alerts where status='PENDING' and (p_event_key is null or event_key=p_event_key) and attempts<3 and next_attempt_at<=now()
  order by created_at,event_key limit 5
 loop
  if a.first_attempt_at is null and n>=12 then continue; end if;
  update jaspic_monitor.alerts set email_payload=coalesce(email_payload,jsonb_build_object(
   'from',c.sender,'to',jsonb_build_array(c.recipient),'subject',subject,'text',message)) where event_key=a.event_key;
  select email_payload into a.email_payload from jaspic_monitor.alerts where event_key=a.event_key;
  update jaspic_monitor.alerts set status='SENDING',attempts=attempts+1,
   first_attempt_at=coalesce(first_attempt_at,now()),last_attempt_at=now(),
   request_id=net.http_post(url:='https://api.resend.com/emails',body:=a.email_payload,
    headers:=jsonb_build_object('Authorization','Bearer '||provider_key,'Content-Type','application/json','Idempotency-Key','jaspic-admin/'||md5(a.event_key)),
    timeout_milliseconds:=10000)
  where event_key=a.event_key;
  if a.first_attempt_at is null then n=n+1; end if;
 end loop;
end $$;
create or replace function jaspic_monitor.tick() returns void
language plpgsql set search_path='' as $$
begin
 if not pg_try_advisory_xact_lock(731908424) then return; end if;
 update jaspic_monitor.config set last_tick_at=now() where id;
 if not exists(select 1 from jaspic_monitor.config where id and enabled) then return; end if;
 perform jaspic_monitor.scan();
 perform jaspic_monitor.send_alerts(null);
end $$;
revoke all on function jaspic_monitor.send_alerts(text) from public,anon,authenticated,service_role;
