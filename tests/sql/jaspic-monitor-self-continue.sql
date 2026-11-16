\ir ../../docs/sql/jaspic-self-continue.sql

-- Drive state transitions as dispatch would. Only test doubles receive pg_net calls.
update jaspic_monitor.config set enabled=true;
delete from cron.scheduled_commands where jobname='jaspic-admin-monitor-every-5-minutes';
select jaspic_monitor.dispatch_scheduled_1800();
do $$begin
 if not exists(select 1 from net.requests where headers->>'X-JASPIC-Trigger'='scheduled-1800')
 then raise exception 'scheduled invocation marker missing'; end if;
end $$;

do $$
declare
 size integer;
 root uuid;
 prior uuid;
 child uuid;
 at_time timestamptz;
 day_key text;
 step integer;
 remaining integer;
 notification_id bigint;
 expected_auth text;
begin
 foreach size in array array[0,20,34,50,100] loop
  truncate jaspic_monitor.alerts,jaspic_monitor.batch_requests,net.requests,net._http_response,
   public.jaspic_deliveries,public.jaspic_runs;
  at_time=((now() at time zone 'Asia/Tokyo')::date-1+time '18:00') at time zone 'Asia/Tokyo';
  day_key=to_char(at_time at time zone 'Asia/Tokyo','YYYY-MM-DD');
  root=gen_random_uuid();
  prior=root;
  insert into public.jaspic_runs values(root,at_time,null,'RUNNING',null,null);
  update public.jaspic_runs set result=jsonb_build_object('scheduledDay',day_key) where id=root;
  insert into public.jaspic_deliveries(province,status,gmail_message_id,run_id)
   select case when n%2=0 then 'hiroshima' else 'shiga' end,
    case when n<=20 then 'SENT' else 'PREPARED' end,
    case when n<=20 then n::text end,root from generate_series(1,size)n;
  update public.jaspic_runs set status='SUCCEEDED',finished_at=at_time+interval '1 minute',
   result=jsonb_build_object('gmailAuth',case when size=0 then 'reauthorize' else 'normal' end,'scheduledDay',day_key,
    'remainingPrepared',greatest(size-20,0),'sent',jsonb_build_object('hiroshima',least(size,20)/2,'shiga',least(size,20)/2),
    'quarantined','[{"province":"hiroshima","count":1},{"province":"shiga","count":2}]'::jsonb)
  where id=root;
  if not exists(select 1 from cron.scheduled_commands where jobname='jaspic-delivery-'||root) then
   raise exception 'scheduled worker not persisted for %',size;
  end if;
  remaining=greatest(size-20,0);
  step=2;
  while remaining>0 loop
   perform jaspic_monitor.run_scheduled_delivery(root,at_time+step*interval '1 minute');
   perform jaspic_monitor.run_scheduled_delivery(root,at_time+step*interval '1 minute');
   if (select count(*) from net.requests where headers->>'X-JASPIC-Resume-Run'=prior::text)<>1
      or exists(select 1 from jaspic_monitor.alerts) then
    raise exception 'duplicate continuation or premature notification for %',size;
   end if;
   child=gen_random_uuid();
   insert into public.jaspic_runs values(child,at_time+step*interval '1 minute',null,'RUNNING',null,null);
   update public.jaspic_deliveries set run_id=child where status='PREPARED';
   update public.jaspic_deliveries set status='SENT',gmail_message_id='synthetic'
    where ctid in (select ctid from public.jaspic_deliveries where run_id=child and status='PREPARED' limit 20);
   remaining=greatest(remaining-20,0);
   update public.jaspic_runs set status='SUCCEEDED',finished_at=at_time+(step+1)*interval '1 minute',
    result=jsonb_build_object('resuming',true,'gmailAuth','normal','remainingPrepared',remaining)
    where id=child;
   prior=child;
   step=step+2;
  end loop;
  perform jaspic_monitor.run_scheduled_delivery(root,at_time+step*interval '1 minute');
  perform jaspic_monitor.run_scheduled_delivery(root,at_time+step*interval '1 minute');
  expected_auth=case when size=0 then '要再認証' else '正常' end;
  if (select count(*) from jaspic_monitor.alerts where event_key='completion:'||day_key
      and message like '%広島県: '||(size/2)||' 件%'
      and message like '%滋賀県: '||(size/2)||' 件%'
      and message like '%保留合計: 3 件%' and message like '%合計: '||size||' 件%'
      and message like '%Google/Gmail認証（配信処理時）: '||expected_auth||'%')<>1
     or (select count(*) from net.requests where url like '%resend%')<>1
     or (select count(*) from net.requests where url like '%/dispatch')<>greatest((size+19)/20-1,0)
  then raise exception 'incorrect completion output or request count for %',size; end if;

  select request_id into notification_id from jaspic_monitor.alerts;
  if size=34 then
   insert into net._http_response values(notification_id,503,'{}');
   perform jaspic_monitor.run_scheduled_delivery(root,at_time+step*interval '1 minute');
   update jaspic_monitor.alerts set next_attempt_at=now() where status='PENDING';
   perform jaspic_monitor.run_scheduled_delivery(root,at_time+step*interval '1 minute');
   if not exists(select 1 from net.requests where url like '%resend%'
     group by headers->>'Idempotency-Key',body having count(*)=2) then
    raise exception 'notification retry changed key or body';
   end if;
   select request_id into notification_id from jaspic_monitor.alerts;
  end if;
  insert into net._http_response values(notification_id,200,'{"id":"synthetic_complete"}');
  perform jaspic_monitor.run_scheduled_delivery(root,at_time+step*interval '1 minute');
  if (select count(*) from jaspic_monitor.alerts where status='SENT')<>1 or
     exists(select 1 from cron.scheduled_commands where jobname='jaspic-delivery-'||root)
  then raise exception 'notification not confirmed or worker left running'; end if;
 end loop;

 -- No HTTP acknowledgement followed by SENDING is ambiguous. Do not reclaim the run or retry.
 truncate jaspic_monitor.alerts,jaspic_monitor.batch_requests,net.requests,net._http_response,
  public.jaspic_deliveries,public.jaspic_runs;
 root=gen_random_uuid();
 child=gen_random_uuid();
 insert into public.jaspic_runs values(root,at_time,null,'RUNNING',null,null);
 update public.jaspic_runs set result=jsonb_build_object('scheduledDay',day_key) where id=root;
 insert into public.jaspic_deliveries(province,status,gmail_message_id,run_id)
  values('hiroshima','PREPARED',null,root);
 update public.jaspic_runs set status='SUCCEEDED',finished_at=at_time+interval '1 minute',
  result=jsonb_build_object('scheduledDay',day_key,'remainingPrepared',1,'gmailAuth','normal') where id=root;
 perform jaspic_monitor.run_scheduled_delivery(root,at_time+interval '2 minutes');
 insert into public.jaspic_runs values(child,at_time+interval '2 minutes',null,'RUNNING',null,null);
 update public.jaspic_deliveries set run_id=child,status='SENDING';
 perform jaspic_monitor.run_scheduled_delivery(root,at_time+interval '3 minutes');
 perform jaspic_monitor.run_scheduled_delivery(root,at_time+interval '13 minutes');
 if (select count(*) from net.requests where url like '%/dispatch')<>1
    or exists(select 1 from jaspic_monitor.alerts where code='DISPATCH_SUCCEEDED')
    or not exists(select 1 from jaspic_monitor.alerts where code='DISPATCH_BATCH_STOPPED'
       and message like '%結果不明: 1 件%' and message like '%確認不能%')
    or not exists(select 1 from public.jaspic_runs where id=child and status='RUNNING')
 then raise exception 'process crash or result uncertainty was not stopped safely'; end if;
end $$;

do $$begin
 if has_function_privilege('anon','jaspic_monitor.dispatch_scheduled_1800()','EXECUTE')
   or has_function_privilege('service_role','jaspic_monitor.start_scheduled_delivery_worker()','EXECUTE')
 then raise exception 'scheduler privilege leak'; end if;
end $$;
