-- Additive JASPIC-only rollout. No dispatch, delivery, baseline or rain job changes.
-- Apply once via Supabase migration. Email stays disabled until recipient/provider are confirmed.
create schema jaspic_monitor;
revoke all on schema jaspic_monitor from public,anon,authenticated,service_role;

alter table public.jaspic_gmail_token_vault
 add column authorized_at timestamptz,
 add column refresh_expires_at timestamptz,
 add column expiry_basis text;
update public.jaspic_gmail_token_vault set authorized_at=updated_at,
 refresh_expires_at=updated_at+interval '7 days',expiry_basis='legacy_saved_at_estimate';

create function jaspic_monitor.record_authorization() returns trigger
language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' or new.encrypted_refresh_token is distinct from old.encrypted_refresh_token then
  new.authorized_at=clock_timestamp();
  new.refresh_expires_at=new.authorized_at+interval '7 days';
  new.expiry_basis='testing_mode_7_days';
 else
  new.authorized_at=old.authorized_at;
  new.refresh_expires_at=old.refresh_expires_at;
  new.expiry_basis=old.expiry_basis;
 end if;
 return new;
end $$;
create trigger jaspic_record_authorization before insert or update on public.jaspic_gmail_token_vault
 for each row execute function jaspic_monitor.record_authorization();

create table jaspic_monitor.config (
 id boolean primary key default true check(id), enabled boolean not null default false,
 activated_at timestamptz not null default now(),
 recipient text, sender text,
 last_tick_at timestamptz,
 check(recipient is null or recipient ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
 check(sender is null or sender ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
 check(not enabled or (recipient is not null and sender is not null))
);
insert into jaspic_monitor.config(id) values(true);

create table jaspic_monitor.alerts (
 event_key text primary key, category text not null, target text not null, code text not null,
 occurred_at timestamptz not null, created_at timestamptz not null default now(),
 subject text not null, message text not null,
 owner_id uuid, credential_expires_at timestamptz,
 status text not null default 'PENDING' check(status in ('PENDING','SENDING','SENT','FAILED','EXPIRED','CANCELLED')),
 attempts integer not null default 0, first_attempt_at timestamptz, last_attempt_at timestamptz,
 next_attempt_at timestamptz not null default now(), request_id bigint,
 provider_id text, error_code text, sent_at timestamptz,
 -- The request body is immutable across retries, including sender/recipient.
 email_payload jsonb
);
create index jaspic_alert_pending on jaspic_monitor.alerts(status,next_attempt_at);
alter table jaspic_monitor.config enable row level security;
alter table jaspic_monitor.alerts enable row level security;
revoke all on all tables in schema jaspic_monitor from public,anon,authenticated,service_role;
-- No grants to service_role: private monitor runs only as the postgres cron owner.

create function jaspic_monitor.enqueue(p_key text,p_category text,p_target text,p_code text,
 p_at timestamptz,p_detail text,p_owner uuid default null,p_expiry timestamptz default null)
returns void language plpgsql set search_path='' as $$
begin
 if p_code !~ '^[A-Z][A-Z0-9_]{0,79}$' or p_target !~ '^[a-z0-9/-]{1,80}$' then
  raise exception 'Invalid monitor event';
 end if;
 insert into jaspic_monitor.alerts(event_key,category,target,code,occurred_at,subject,message,owner_id,credential_expires_at)
 values(p_key,p_category,p_target,p_code,p_at,'[JASPIC 運用通知] '||p_category,
  'JASPIC管理者向け通知'||E'\n発生日時（日本時間）: '||to_char(p_at at time zone 'Asia/Tokyo','YYYY-MM-DD HH24:MI:SS')||
  E'\n対象処理: '||p_target||E'\nエラー・状態: '||p_code||E'\n'||p_detail||
  E'\n再認証ページ: https://emergencyalert.news/jaspic/oauth\n※防犯情報の再送は行いません。',p_owner,p_expiry)
 on conflict(event_key) do nothing;
end $$;

create function jaspic_monitor.scan(p_now timestamptz default now()) returns void
language plpgsql set search_path='' as $$
declare c jaspic_monitor.config; v record; r record; e record;
 expected_at timestamptz; day_key text; kind text; scope text; error_text text;
begin
 select * into strict c from jaspic_monitor.config where id;
 -- Pending warnings for replaced/deleted credentials must never be delivered.
 update jaspic_monitor.alerts a set status='CANCELLED',error_code='AUTHORIZATION_REPLACED'
 where a.category='Google再認証' and a.status in ('PENDING','SENDING') and not exists(
  select 1 from public.jaspic_gmail_token_vault cred where cred.owner_id=a.owner_id and cred.refresh_expires_at=a.credential_expires_at);
 for v in select owner_id,refresh_expires_at,expiry_basis from public.jaspic_gmail_token_vault
  where refresh_expires_at<=p_now+interval '24 hours'
 loop
  perform jaspic_monitor.enqueue('oauth:'||v.owner_id||':'||extract(epoch from v.refresh_expires_at),
   'Google再認証','gmail-oauth','OAUTH_REAUTHORIZATION_DUE',v.refresh_expires_at-interval '24 hours',
   '認証期限（日本時間）: '||to_char(v.refresh_expires_at at time zone 'Asia/Tokyo','YYYY-MM-DD HH24:MI:SS')||
   E'\n期限の約24時間前、または期限経過後の未通知分をお知らせします。\nテストモード7日を前提とした管理上の期限です。\n期限算定: '||v.expiry_basis,v.owner_id,v.refresh_expires_at);
 end loop;
 expected_at=((p_now at time zone 'Asia/Tokyo')::date+time '18:00') at time zone 'Asia/Tokyo';
 if p_now<expected_at then expected_at=expected_at-interval '1 day'; end if;
 day_key=to_char(expected_at at time zone 'Asia/Tokyo','YYYY-MM-DD');
 if expected_at>=c.activated_at and p_now>=expected_at+interval '10 minutes' then
  if not exists(select 1 from cron.job_run_details d join cron.job j using(jobid)
   where j.jobname='jaspic-production-1800-jst' and d.start_time>=expected_at
   and d.start_time<expected_at+interval '10 minutes' and d.status='succeeded')
   or not exists(select 1 from public.jaspic_runs where started_at>=expected_at and started_at<expected_at+interval '10 minutes') then
   perform jaspic_monitor.enqueue('missing:'||day_key,'18時自動実行未起動','jaspic/dispatch','SCHEDULED_RUN_MISSING',expected_at,
    '18:00のcron成功記録、または18:00〜18:10の処理開始記録がありません。HTTP拒否・設定不足・プロセス起動失敗を含みます。');
  end if;
 end if;
 for r in select * from public.jaspic_runs where started_at>=c.activated_at and started_at<=p_now
  and started_at>=p_now-interval '48 hours'
  and (status='FAILED' or (status='RUNNING' and started_at<=p_now-interval '10 minutes'))
  order by started_at
 loop
  day_key=to_char(r.started_at at time zone 'Asia/Tokyo','YYYY-MM-DD');
  scope=case when r.result->>'province' in ('hiroshima','shiga') then r.result->>'province' else 'jaspic/dispatch' end;
  error_text=case when r.error_code ~ '^[A-Z][A-Z0-9_]{0,79}$' then r.error_code else 'JASPIC_RUN_FAILED' end;
  kind=case when r.status='RUNNING' then '処理未完了'
   when r.result->>'stage'='gmail-auth' or error_text ~ '^GMAIL_(REFRESH|TOKEN|NOT_CONNECTED)' then 'Gmail認証失敗'
   when coalesce((r.result->'sent'->>'hiroshima')::integer,0)+coalesce((r.result->'sent'->>'shiga')::integer,0)>0 then '一部メール送信失敗'
   when r.result->>'stage'='gmail-send' then 'Gmail送信失敗' else '自動処理失敗' end;
  if r.status='RUNNING' then error_text='RUN_TIMEOUT'; end if;
  perform jaspic_monitor.enqueue('run:'||day_key||':'||kind||':'||scope,kind,scope,error_text,r.started_at,
   '実行ID: '||r.id||E'\n処理段階: '||case when r.result->>'stage' ~ '^[a-z-]{1,40}$' then r.result->>'stage' else 'unknown' end||
   E'\n送信済み件数（広島/滋賀）: '||coalesce(r.result->'sent'->>'hiroshima','0')||'/'||coalesce(r.result->'sent'->>'shiga','0'));
  for e in select value from jsonb_array_elements(case when jsonb_typeof(r.result->'sourceErrors')='array' then r.result->'sourceErrors' else '[]'::jsonb end)
  loop
   if e.value->>'province' in ('hiroshima','shiga') then
    perform jaspic_monitor.enqueue('source:'||day_key||':'||(e.value->>'province'),'県データ取得失敗',e.value->>'province','SOURCE_FETCH_FAILED',r.started_at,'実行ID: '||r.id);
   end if;
  end loop;
 end loop;
end $$;

create function jaspic_monitor.tick() returns void
language plpgsql set search_path='' as $$
declare c jaspic_monitor.config; a record; h record; provider_key text; n integer; accepted_id text;
begin
 -- Serializes overlapping cron/manual ticks before scanning or reserving sends.
 if not pg_try_advisory_xact_lock(731908424) then return; end if;
 select * into strict c from jaspic_monitor.config where id;
 update jaspic_monitor.config set last_tick_at=now() where id;
 if not c.enabled then return; end if;
 perform jaspic_monitor.scan();
 for a in select * from jaspic_monitor.alerts where status='SENDING' loop
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
 where status='PENDING' and first_attempt_at<now()-interval '23 hours';
 select decrypted_secret into provider_key from vault.decrypted_secrets where name='jaspic_monitor_resend_api_key';
 if provider_key is null or provider_key='' then return; end if;
 -- Hard daily cap on distinct alerts, regardless of repeated/manual ticks.
 select count(*) into n from jaspic_monitor.alerts where first_attempt_at >=
  (date_trunc('day',now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo');
 for a in select * from jaspic_monitor.alerts where status='PENDING' and attempts<3 and next_attempt_at<=now()
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
revoke all on all functions in schema jaspic_monitor from public,anon,authenticated,service_role;
-- All functions are SECURITY INVOKER; neither app roles nor public RPCs can read Vault.
-- Schedule only the additional monitor. Existing production/rain jobs are untouched.
select cron.schedule('jaspic-admin-monitor-every-5-minutes','*/5 * * * *','select jaspic_monitor.tick();');
