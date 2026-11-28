-- Issue #238: isolated dry-run smoke test; all writes are rolled back.
-- Run ONLY on the approved EmergencyAlert Supabase project, after verifying
-- jaspic_isolated_test is private and the test schema migration is installed.
begin;
do $$
declare
  v_total integer;
  v_sending integer;
  v_remaining integer;
  v_claimed integer;
  v_unknown integer;
begin
  if current_database() <> 'postgres' then
    raise exception 'Unexpected database';
  end if;
  if not exists (select 1 from pg_namespace where nspname='jaspic_isolated_test') then
    raise exception 'Test schema not installed';
  end if;
  if has_schema_privilege('service_role','jaspic_isolated_test','USAGE')
     or has_function_privilege('service_role','jaspic_isolated_test.claim_batch(integer)','EXECUTE') then
    raise exception 'Test schema unexpectedly accessible to app service role';
  end if;
  if exists (select 1 from jaspic_isolated_test.deliveries) then
    raise exception 'Test table not empty: refusing to mix runs';
  end if;
  insert into jaspic_isolated_test.deliveries(prefecture,source_id)
  select case when i<=31 then 'hiroshima' else 'shiga' end,
         'synthetic-238-' || lpad(i::text,2,'0')
  from generate_series(1,34) i;
  select count(*) into v_total from jaspic_isolated_test.deliveries;
  if v_total<>34 then raise exception 'Expected 34, got %',v_total; end if;
  insert into jaspic_isolated_test.deliveries(prefecture,source_id)
  values ('hiroshima','synthetic-238-01')
  on conflict(prefecture,source_id) do nothing;
  select count(*) into v_total from jaspic_isolated_test.deliveries;
  if v_total<>34 then raise exception 'Duplicate registration'; end if;
  select count(*) into v_claimed from jaspic_isolated_test.claim_batch(10);
  select count(*) filter(where state='SENDING'),
         count(*) filter(where state='PREPARED')
    into v_sending,v_remaining from jaspic_isolated_test.deliveries;
  if v_claimed<>10 or v_sending<>10 or v_remaining<>24 then
    raise exception 'Batch mismatch: claimed %, sending %, remaining %',v_claimed,v_sending,v_remaining;
  end if;
  update jaspic_isolated_test.deliveries set state='UNKNOWN' where state='SENDING';
  select count(*) filter(where state='UNKNOWN') into v_unknown from jaspic_isolated_test.deliveries;
  if v_unknown<>10 then raise exception 'UNKNOWN count mismatch'; end if;
  select count(*) into v_claimed from jaspic_isolated_test.claim_batch(10);
  if v_claimed<>10 then raise exception 'Resume did not claim 10'; end if;
  if exists (select 1 from jaspic_isolated_test.deliveries
             where state='SENDING' and source_id <= 'synthetic-238-10') then
    raise exception 'UNKNOWN rows automatically reclaimed';
  end if;
  raise notice 'PASS: 34 synthetic rows, duplicate guard, batch10, UNKNOWN10, resumed10';
end $$;
rollback;
-- Run separately afterward: select count(*) from jaspic_isolated_test.deliveries;
-- Expected 0. True concurrent-connection testing and Gmail delivery NOT covered.
