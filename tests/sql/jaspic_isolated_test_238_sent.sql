-- Issue #238: SENT idempotency assertions, rollback-only, synthetic IDs.
begin;
do $$
declare v_id bigint; v_first boolean; v_second boolean; v_state text; v_message text;
begin
  if exists(select 1 from jaspic_isolated_test.deliveries) then
    raise exception 'Test table must be empty';
  end if;
  insert into jaspic_isolated_test.deliveries(prefecture,source_id)
  values('hiroshima','synthetic-sent-238') returning id into v_id;
  perform * from jaspic_isolated_test.claim_batch(1);
  select jaspic_isolated_test.finish_claim(v_id,'SENT','synthetic-message-238') into v_first;
  select jaspic_isolated_test.finish_claim(v_id,'SENT','synthetic-message-238') into v_second;
  select state,gmail_message_id into v_state,v_message from jaspic_isolated_test.deliveries where id=v_id;
  if not v_first or v_second or v_state<>'SENT' or v_message<>'synthetic-message-238' then
    raise exception 'SENT idempotency failed: %,%,%,%',v_first,v_second,v_state,v_message;
  end if;
  raise notice 'PASS: SENT requires one successful finish; repeat finish rejected';
end $$;
rollback;
