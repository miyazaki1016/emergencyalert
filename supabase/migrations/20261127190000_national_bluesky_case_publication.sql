create table public.national_bluesky_case_cursor (
  id boolean primary key default true check (id),
  base text,
  snapshot jsonb
);
create table public.national_bluesky_case_posts (
  id text primary key,
  record_micros bigint unique not null,
  kind text not null check (kind in ('individual','prefecture','digest')),
  text text not null,
  items jsonb not null,
  expires_at timestamptz not null,
  status text not null check (status in ('sending','retry','sent','expired')),
  attempts timestamptz[] not null,
  claim_until timestamptz not null,
  uri text,
  sent_at timestamptz,
  video_status text,
  last_error text
);
create table public.national_bluesky_case_items (
  item_key text primary key,
  payload jsonb not null,
  due_at timestamptz not null,
  expires_at timestamptz not null,
  post_id text references public.national_bluesky_case_posts(id)
);
create index national_bluesky_case_items_pending on public.national_bluesky_case_items(due_at,expires_at) where post_id is null;
alter table public.national_bluesky_case_cursor enable row level security;
alter table public.national_bluesky_case_posts enable row level security;
alter table public.national_bluesky_case_items enable row level security;
revoke all on public.national_bluesky_case_cursor,public.national_bluesky_case_posts,public.national_bluesky_case_items from public, anon, authenticated, service_role;
grant select,insert,update on public.national_bluesky_case_cursor,public.national_bluesky_case_posts,public.national_bluesky_case_items to service_role;

create function public.stage_national_bluesky_cases(p_expected text, p_base text, p_snapshot jsonb, p_items jsonb)
returns boolean language plpgsql set search_path = '' as $$
declare prior text;
begin
  insert into public.national_bluesky_case_cursor(id) values(true) on conflict do nothing;
  select base into prior from public.national_bluesky_case_cursor where id for update;
  if prior is distinct from p_expected then return false; end if;
  insert into public.national_bluesky_case_items(item_key,payload,due_at,expires_at)
  select item->>'item_key',item,(item->>'due_at')::timestamptz,(item->>'expires_at')::timestamptz
  from jsonb_array_elements(p_items) item on conflict do nothing;
  update public.national_bluesky_case_cursor set base=p_base,snapshot=p_snapshot where id;
  return true;
end;
$$;

create function public.claim_national_bluesky_case(p_id text,p_kind text,p_text text,p_items jsonb,p_expires timestamptz)
returns jsonb language plpgsql set search_path = '' as $$
declare
  at_time timestamptz := clock_timestamp();
  lease timestamptz := at_time + interval '2 minutes';
  prior public.national_bluesky_case_posts%rowtype;
  keys text[];
  item_count integer;
  record_micros bigint;
begin
  perform pg_advisory_xact_lock(712004317);
  select * into prior from public.national_bluesky_case_posts where id=p_id;
  if found then
    if prior.status not in ('retry','sending') or prior.claim_until > at_time then return null; end if;
  else
    if p_expires <= at_time then return null; end if;
    select array_agg(distinct item->>'item_key') into keys from jsonb_array_elements(p_items) item;
    select count(*) into item_count from public.national_bluesky_case_items
      where item_key=any(keys) and post_id is null and due_at<=at_time and expires_at>at_time;
    if coalesce(cardinality(keys),0)=0 or item_count<>cardinality(keys) then return null; end if;
  end if;
  if (select count(*) from public.national_bluesky_case_posts p cross join lateral unnest(p.attempts) attempt
    where attempt > at_time - interval '1 hour') >= 6 then return null; end if;
  if prior.id is null then
    select greatest(floor(extract(epoch from at_time) * 1000000)::bigint, coalesce(max(p.record_micros) + 1, 0))
      into record_micros from public.national_bluesky_case_posts p;
    insert into public.national_bluesky_case_posts(id,record_micros,kind,text,items,expires_at,status,attempts,claim_until)
      values(p_id,record_micros,p_kind,p_text,p_items,p_expires,'sending',array[at_time],lease);
    update public.national_bluesky_case_items set post_id=p_id where item_key=any(keys);
  else
    record_micros := prior.record_micros;
    update public.national_bluesky_case_posts set status='sending',attempts=array_append(attempts,at_time),claim_until=lease where id=p_id;
  end if;
  return jsonb_build_object('lease',lease,'micros',record_micros::text);
end;
$$;

revoke all on function public.stage_national_bluesky_cases(text,text,jsonb,jsonb),
  public.claim_national_bluesky_case(text,text,text,jsonb,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.stage_national_bluesky_cases(text,text,jsonb,jsonb),
  public.claim_national_bluesky_case(text,text,text,jsonb,timestamptz) to service_role;
