-- Issue #238: terminal-state invariants. Run only on the approved isolated schema.
-- All writes are rolled back; no Gmail calls.
begin;
do $$
declare
  v_id bigint;
  v_ok boolean;
  v_state text;
  v_msg text;
begin
  if has_schema_privilege('service_role','jaspic_isolated_test','USAGE') then
    raise exception 'Unsafe test schema privileges';
  end if;
  if exists (select 1 from jaspic_isolated_test.deliveries) then
    raise exception 'Refusing to run against populated test table';
  end if;
  insert into jaspic_isolated_test.deliveries(prefecture,source_id)
  values ('shiga','synthetic-terminal-238')
  returning id into v_id;
  select count(*)=1 into v_ok from jaspic_isolated_test.claim_batch(1);
  if not v_ok then raise exception 'claim failed'; end if;
  select jaspic_isolated_test.finish_claim(v_id,'UNKNOWN') into v_ok;
  if not v_ok then raise exception 'UNKNOWN transition failed'; end if;
  select jaspic_isolated_test.finish_claim(v_id,'SENT','fake-message-id') into v_ok;
  if v_ok then raise exception 'UNKNOWN was overwritten'; end if;
  select state,gmail_message_id into v_state,v_msg
  from jaspic_isolated_test.deliveries where id=v_id;
  if v_state<>'UNKNOWN' or v_msg is not null then
    raise exception 'Terminal state mismatch';
  end if;
  raise notice 'PASS: UNKNOWN is terminal and cannot become SENT';
end $$;
rollback;
