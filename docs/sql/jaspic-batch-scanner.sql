create or replace function jaspic_monitor.gmail_auth_detail(p_status text) returns text
language sql immutable set search_path='' as $$
 select E'\nGoogle/Gmail認証（配信処理時）: '||case p_status
  when 'normal' then '正常（Googleでトークン更新成功）'
  when 'reauthorize' then '要再認証'
  else '確認不能' end
$$;

create or replace function jaspic_monitor.scan_batch_completions(p_now timestamptz, p_root uuid) returns void
language plpgsql set search_path='' as $$
declare c jaspic_monitor.config; r record; day_key text; h integer; s integer;
 total integer; pending integer; uncertain integer; failed integer; other_count integer;
 last_run record; auth_detail text; hp integer; sp integer; req record; dispatch_token text; request_id bigint;
begin
 select * into strict c from jaspic_monitor.config where id;
 if not pg_catalog.pg_try_advisory_xact_lock(144166021,231) then return; end if;
 if p_root is null and not c.enabled then return; end if;
 for r in
  select distinct on ((started_at at time zone 'Asia/Tokyo')::date) *
  from public.jaspic_runs runs
  where (p_root is null and result->>'scheduledDay' is null
         or (runs.id=p_root and result->>'scheduledDay'=to_char(started_at at time zone 'Asia/Tokyo','YYYY-MM-DD')))
   and (status='SUCCEEDED' or (runs.id=p_root and status='FAILED')) and (p_root is not null or not coalesce(result->>'resuming'='true',false)) and finished_at is not null and finished_at<=p_now
   and (p_root is not null or (started_at>=c.activated_at and started_at>=p_now-interval '48 hours'))
   and finished_at>=started_at
   -- Same scheduled-start window used by the existing missing-run watchdog.
   and (started_at at time zone 'Asia/Tokyo')::time>=time '18:00'
   and (started_at at time zone 'Asia/Tokyo')::time<time '18:10'
   and (p_root is not null or exists(select 1 from cron.job_run_details d join cron.job j using(jobid)
    where j.jobname='jaspic-production-1800-jst' and d.status='succeeded'
     and d.start_time>=(((runs.started_at at time zone 'Asia/Tokyo')::date+time '18:00') at time zone 'Asia/Tokyo')
     and d.start_time<=runs.started_at))
  order by (started_at at time zone 'Asia/Tokyo')::date,started_at,id
 loop
  day_key=to_char(r.started_at at time zone 'Asia/Tokyo','YYYY-MM-DD');
  if exists(select 1 from jaspic_monitor.alerts where event_key='completion:'||day_key) then continue; end if;
  auth_detail=jaspic_monitor.gmail_auth_detail(r.result->>'gmailAuth');
  if r.status='FAILED' then
   perform jaspic_monitor.enqueue('batch-stopped:'||day_key,'分割配信停止','jaspic/dispatch',
    'DISPATCH_BATCH_STOPPED',r.finished_at,'18時の配信処理が停止しました。'||E'\n実行ID: '||r.id||auth_detail);
   continue;
  end if;
  hp=0;
  sp=0;
  if r.result ? 'remainingPrepared' then
   select count(*), count(*) filter(where status='SENT' and province='hiroshima' and gmail_message_id is not null),
    count(*) filter(where status='SENT' and province='shiga' and gmail_message_id is not null),
    count(*) filter(where status='PREPARED'), count(*) filter(where status in ('SENDING','UNKNOWN')),
    count(*) filter(where status='FAILED')
   into total,h,s,pending,uncertain,failed
   from public.jaspic_deliveries where initial_run_id=r.id;
   other_count=total-h-s-pending-uncertain-failed;
   select rr.* into last_run from public.jaspic_runs rr where rr.id=r.id
    or exists(select 1 from public.jaspic_deliveries d where d.initial_run_id=r.id and d.run_id=rr.id)
    or (p_root is not null and rr.status='FAILED' and exists(
     select 1 from public.jaspic_deliveries d where d.initial_run_id=r.id
      and d.status='PREPARED' and rr.result->>'priorRunId'=d.run_id::text))
    order by rr.started_at desc, rr.id desc limit 1;
   auth_detail=jaspic_monitor.gmail_auth_detail(last_run.result->>'gmailAuth');
   if exists(select 1 from public.jaspic_runs where status='RUNNING') then
    if p_root is null or exists(select 1 from public.jaspic_runs
       where status='RUNNING' and started_at>p_now-interval '10 minutes') then continue; end if;
    -- The existing RUNNING lock stays in place. Only an operator may reconcile it.
    last_run.status='FAILED';
   end if;
   if pending>0 and uncertain=0 and failed=0 and other_count=0 and last_run.status='SUCCEEDED'
      and total=coalesce((r.result->'sent'->>'hiroshima')::integer,0)
               +coalesce((r.result->'sent'->>'shiga')::integer,0)+(r.result->>'remainingPrepared')::integer then
    select * into req from jaspic_monitor.batch_requests where prior_run_id=last_run.id;
    if found then
     if req.requested_at>p_now-interval '10 minutes' then continue; end if;
    elsif not exists(select 1 from public.jaspic_deliveries
       where status in ('PREPARED','SENDING','UNKNOWN','FAILED') and initial_run_id is distinct from r.id) then
     select decrypted_secret into dispatch_token from vault.decrypted_secrets where name='jaspic_production_dispatch_token';
     if nullif(dispatch_token,'') is not null then
      request_id=net.http_post(url:='https://emergencyalert.news/jaspic/dispatch',
       headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||dispatch_token,'X-JASPIC-Resume-Run',last_run.id::text),
       body:='{}'::jsonb,timeout_milliseconds:=300000);
      insert into jaspic_monitor.batch_requests values(last_run.id,request_id,p_now);
      continue;
     end if;
    end if;
   end if;
   if pending+uncertain+failed+other_count>0 or last_run.status<>'SUCCEEDED'
      or total<>coalesce((r.result->'sent'->>'hiroshima')::integer,0)
                +coalesce((r.result->'sent'->>'shiga')::integer,0)+(r.result->>'remainingPrepared')::integer then
    perform jaspic_monitor.enqueue('batch-stopped:'||day_key,'分割配信停止','jaspic/dispatch',
     'DISPATCH_BATCH_STOPPED',p_now,'実行ID: '||r.id||
     E'\n送信済み（広島/滋賀）: '||h||'/'||s||
     E'\n未送信: '||(pending+failed)||' 件'||E'\n結果不明: '||(uncertain+other_count)||' 件'||auth_detail);
    continue;
   end if;
   r.finished_at=last_run.finished_at;
   select coalesce(sum((item->>'count')::integer) filter(where item->>'province'='hiroshima'),0),
          coalesce(sum((item->>'count')::integer) filter(where item->>'province'='shiga'),0)
   into hp,sp from jsonb_array_elements(coalesce(r.result->'quarantined','[]'::jsonb)) item;
  else
  -- A missing/malformed count is not evidence that zero messages were sent.
  if r.result->'sent'->>'hiroshima' is null or r.result->'sent'->>'shiga' is null
   or r.result->'sent'->>'hiroshima' !~ '^(0|[1-9][0-9]?)$'
   or r.result->'sent'->>'shiga' !~ '^(0|[1-9][0-9]?)$' then
   perform jaspic_monitor.enqueue('completion-invalid:'||day_key,'完了結果確認','jaspic/dispatch',
    'COMPLETION_RESULT_INVALID',r.finished_at,'成功記録の県別送信件数を読み取れません。実行ID: '||r.id);
   continue;
  end if;
  h=(r.result->'sent'->>'hiroshima')::integer;
  s=(r.result->'sent'->>'shiga')::integer;
  if h+s>20 then
   perform jaspic_monitor.enqueue('completion-invalid:'||day_key,'完了結果確認','jaspic/dispatch',
    'COMPLETION_RESULT_INVALID',r.finished_at,'成功記録の送信件数が配信上限を超えています。実行ID: '||r.id);
   continue;
  end if;
  end if;
  perform jaspic_monitor.enqueue('completion:'||day_key,'配信完了','jaspic/dispatch','DISPATCH_SUCCEEDED',r.finished_at,
   '18時の配信処理が正常終了しました。'||
   E'\n広島県: '||h||E' 件\n滋賀県: '||s||E' 件\n合計: '||(h+s)||' 件'||
   E'\n広島県 保留: '||hp||E' 件\n滋賀県 保留: '||sp||E' 件\n保留合計: '||(hp+sp)||' 件'||
   E'\n未送信: 0 件'||
   case when h+s+hp+sp=0 then E'\n今回は送信対象の新規・更新情報が0件でした。両県の確認処理は正常に完了しています。' else '' end||
   E'\n処理開始（日本時間）: '||to_char(r.started_at at time zone 'Asia/Tokyo','YYYY-MM-DD HH24:MI:SS')||
   E'\n処理完了（日本時間）: '||to_char(r.finished_at at time zone 'Asia/Tokyo','YYYY-MM-DD HH24:MI:SS')||
   E'\n実行ID: '||r.id||auth_detail);
 end loop;
end $$;


create or replace function jaspic_monitor.scan_completions(p_now timestamptz default now()) returns void
language sql set search_path='' as $$
 select jaspic_monitor.scan_batch_completions(p_now,null)
$$;
revoke all on function jaspic_monitor.gmail_auth_detail(text),
 jaspic_monitor.scan_batch_completions(timestamptz,uuid) from public,anon,authenticated,service_role;
