-- Issue #238: exact snapshot import guard, synthetic data, rollback-only.
begin;
do $$
declare
  v_good jsonb;
  v_bad jsonb;
  v_count integer;
  v_rejected boolean;
begin
  if exists(select 1 from jaspic_isolated_test.deliveries) then
    raise exception 'Refusing to test against populated private table';
  end if;
  select jsonb_agg(jsonb_build_object('prefecture',
    case when n<=31 then 'hiroshima' else 'shiga' end,
    'source_id','dryrun-238-'||n)) into v_good from generate_series(1,34) n;
  -- Missing one Shiga record must be rejected without writing.
  select jsonb_agg(x) into v_bad from jsonb_array_elements(v_good) with ordinality as t(x,n) where n<34;
  v_rejected:=false;
  begin
    perform jaspic_isolated_test.import_snapshot(v_bad);
  exception when others then v_rejected:=true;
  end;
  if not v_rejected or exists(select 1 from jaspic_isolated_test.deliveries) then
    raise exception 'Wrong-count import was not rejected atomically';
  end if;
  -- Duplicate source key must be rejected.
  select jsonb_agg(case when n=34 then v_good->32 else x end) into v_bad
    from jsonb_array_elements(v_good) with ordinality as t(x,n);
  v_rejected:=false;
  begin
    perform jaspic_isolated_test.import_snapshot(v_bad);
  exception when others then v_rejected:=true;
  end;
  if not v_rejected or exists(select 1 from jaspic_isolated_test.deliveries) then
    raise exception 'Duplicate import was not rejected atomically';
  end if;
  perform jaspic_isolated_test.import_snapshot(v_good);
  select count(*) into v_count from jaspic_isolated_test.deliveries;
  if v_count<>34 then raise exception 'Expected 34 staged rows'; end if;
  -- Re-import must be blocked, not overwrite existing state.
  v_rejected:=false;
  begin
    perform jaspic_isolated_test.import_snapshot(v_good);
  exception when others then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'Repeat import not rejected'; end if;
  raise notice 'PASS: exact 31+3, duplicate, repeat, and atomicity guards';
end $$;
rollback;
