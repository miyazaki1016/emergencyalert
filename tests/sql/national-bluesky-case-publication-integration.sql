begin;
\ir ../../supabase/migrations/20261127190000_national_bluesky_case_publication.sql

do $$
declare
  i integer;
  item jsonb;
  selected jsonb;
  lease jsonb;
  first_micros text;
  expiration timestamptz := clock_timestamp() + interval '1 hour';
begin
  if has_table_privilege('anon', 'public.national_bluesky_case_posts', 'SELECT')
    or has_table_privilege('authenticated', 'public.national_bluesky_case_items', 'INSERT')
    or has_function_privilege('anon', 'public.claim_national_bluesky_case(text,text,text,jsonb,timestamptz)', 'EXECUTE') then
    raise exception 'Bluesky outbox is exposed';
  end if;
  select jsonb_agg(jsonb_build_object('item_key', n::text, 'due_at', clock_timestamp() - interval '1 minute', 'expires_at', expiration))
    into item from generate_series(1,7) n;
  if not public.stage_national_bluesky_cases(null, 'initial', '{}', item) then raise exception 'initial stage rejected'; end if;
  if public.stage_national_bluesky_cases(null, 'racing', '{}', item) then raise exception 'concurrent stage overwrote cursor'; end if;
  if not public.stage_national_bluesky_cases('initial', 'second', '{}', item) then raise exception 'repeated milestone stage failed'; end if;
  if (select count(*) from public.national_bluesky_case_items) <> 7 then raise exception 'duplicate milestone created'; end if;

  for i in 1..7 loop
    selected := jsonb_build_array(item->(i-1));
    lease := public.claim_national_bluesky_case('post-' || i,'individual','fixture',selected,expiration);
    if (i <= 6 and lease is null) or (i = 7 and lease is not null) then raise exception 'hourly cap failed'; end if;
    if i = 1 then
      first_micros := lease->>'micros';
      if public.claim_national_bluesky_case('post-1','individual','fixture',selected,expiration) is not null
        or public.claim_national_bluesky_case('duplicate','individual','fixture',selected,expiration) is not null then
        raise exception 'duplicate claim accepted';
      end if;
    end if;
  end loop;
  update public.national_bluesky_case_posts set status='retry',claim_until=clock_timestamp() - interval '1 second',
    attempts=array[clock_timestamp() - interval '65 minutes'] where id='post-1';
  if public.claim_national_bluesky_case('post-1','individual','fixture',jsonb_build_array(item->0),expiration)->>'micros' is distinct from first_micros then
    raise exception 'expired lease could not resume with the original record key';
  end if;
end;
$$;
rollback;
