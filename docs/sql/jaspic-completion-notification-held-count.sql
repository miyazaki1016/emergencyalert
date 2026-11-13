-- Extend the existing daily completion notification without changing dispatch or mail transport.
-- Run only after the existing completion notification migration is installed.
create or replace function jaspic_monitor.scan_completions(p_now timestamptz default now()) returns void
language plpgsql set search_path='' as $$
declare c jaspic_monitor.config; r record; day_key text; h integer; s integer; hh integer; sh integer;
begin
 select * into strict c from jaspic_monitor.config where id;
 if not c.enabled then return; end if;
 for r in
  select distinct on ((started_at at time zone 'Asia/Tokyo')::date) *
  from public.jaspic_runs runs
  where status='SUCCEEDED' and finished_at is not null and finished_at<=p_now
   and started_at>=c.activated_at and started_at>=p_now-interval '48 hours'
   and finished_at>=started_at
   and (started_at at time zone 'Asia/Tokyo')::time>=time '18:00'
   and (started_at at time zone 'Asia/Tokyo')::time<time '18:10'
   and exists(select 1 from cron.job_run_details d join cron.job j using(jobid)
    where j.jobname='jaspic-production-1800-jst' and d.status='succeeded'
     and d.start_time>=(((runs.started_at at time zone 'Asia/Tokyo')::date+time '18:00') at time zone 'Asia/Tokyo')
     and d.start_time<=runs.started_at)
  order by (started_at at time zone 'Asia/Tokyo')::date,started_at,id
 loop
  day_key=to_char(r.started_at at time zone 'Asia/Tokyo','YYYY-MM-DD');
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
  -- Held counts are from the production plan's quarantine, not excluded
  -- categories such as bicycle theft. Never interpret missing data as zero.
  if jsonb_typeof(r.result->'quarantined') <> 'array'
   or jsonb_array_length(r.result->'quarantined') <> 2
   or (select count(*) from jsonb_array_elements(r.result->'quarantined') q
       where q->>'province' in ('hiroshima','shiga')
         and q->>'count' ~ '^(0|[1-9][0-9]{0,6})$') <> 2
   or (select count(distinct q->>'province') from jsonb_array_elements(r.result->'quarantined') q) <> 2 then
   perform jaspic_monitor.enqueue('completion-invalid:'||day_key,'完了結果確認','jaspic/dispatch',
    'COMPLETION_RESULT_INVALID',r.finished_at,'成功記録の県別保留件数を読み取れません。実行ID: '||r.id);
   continue;
  end if;
  select (q->>'count')::integer into hh from jsonb_array_elements(r.result->'quarantined') q where q->>'province'='hiroshima';
  select (q->>'count')::integer into sh from jsonb_array_elements(r.result->'quarantined') q where q->>'province'='shiga';
  perform jaspic_monitor.enqueue('completion:'||day_key,'配信完了','jaspic/dispatch','DISPATCH_SUCCEEDED',r.finished_at,
   '18時の配信処理が正常終了しました。'||
   E'\n広島県: 送信 '||h||' 件 / 保留 '||hh||' 件'||
   E'\n滋賀県: 送信 '||s||' 件 / 保留 '||sh||' 件'||
   E'\n送信合計: '||(h+s)||' 件 / 保留合計: '||(hh+sh)||' 件'||
   E'\n※自転車盗など恒久的な配信対象外は保留に含みません。'||
   case when h+s=0 then E'\n今回は送信対象の新規・更新情報が0件でした。両県の確認処理は正常に完了しています。' else '' end||
   E'\n処理開始（日本時間）: '||to_char(r.started_at at time zone 'Asia/Tokyo','YYYY-MM-DD HH24:MI:SS')||
   E'\n処理完了（日本時間）: '||to_char(r.finished_at at time zone 'Asia/Tokyo','YYYY-MM-DD HH24:MI:SS')||
   E'\n実行ID: '||r.id);
 end loop;
end $$;
revoke all on function jaspic_monitor.scan_completions(timestamptz) from public,anon,authenticated,service_role;
