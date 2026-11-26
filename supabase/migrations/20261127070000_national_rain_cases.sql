create table public.national_rain_cases (
  slug text primary key check (slug ~ '^[0-9]{5}-[0-9]{8}-[0-9]{4}$'),
  municipality_code text not null check (municipality_code ~ '^[0-9]{5}$'),
  prefecture text not null,
  municipality text not null,
  first_base timestamptz not null,
  first_valid_time timestamptz not null,
  last_base timestamptz not null,
  peak_tier smallint not null check (peak_tier in (30,50,80)),
  peak_valid_time timestamptz not null,
  status text not null default 'forecast' check (status in ('forecast','ended','verified')),
  ended_at timestamptz,
  permanent boolean generated always as (peak_tier >= 50) stored,
  details_expire_at timestamptz,
  verification_summary jsonb
);
create unique index national_rain_cases_one_open on public.national_rain_cases (municipality_code) where status = 'forecast';
create index national_rain_cases_prefecture on public.national_rain_cases (prefecture, first_base desc) where permanent;
create table public.national_rain_case_versions (
  slug text not null references public.national_rain_cases(slug),
  base_time timestamptz not null,
  detail_state text not null check (detail_state in ('rain','below','unknown')),
  peak_tier smallint check (peak_tier in (30,50,80)),
  peak_valid_time timestamptz,
  slots jsonb not null,
  verification jsonb,
  primary key (slug, base_time)
);
create table public.national_rain_case_cursor (
  id boolean primary key default true check (id),
  base_time timestamptz not null
);

alter table public.national_rain_cases enable row level security;
alter table public.national_rain_case_versions enable row level security;
alter table public.national_rain_case_cursor enable row level security;
revoke all on public.national_rain_cases, public.national_rain_case_versions, public.national_rain_case_cursor
  from public, anon, authenticated, service_role;
grant select, insert, update on public.national_rain_cases to service_role;
grant select, insert, update, delete on public.national_rain_case_versions to service_role;
grant select, insert, update on public.national_rain_case_cursor to service_role;

create function public.ingest_national_rain_case_version(p_base timestamptz, p_batch jsonb)
returns boolean language plpgsql set search_path = '' as $$
declare
  last_ingested timestamptz;
  candidate record;
  incident public.national_rain_cases%rowtype;
  episode_slots jsonb;
  episode_state text;
  version_peak smallint;
  version_peak_time timestamptz;
  prior_dry boolean;
begin
  if p_base is null or jsonb_typeof(p_batch) is distinct from 'array'
     or not exists (select 1 from jsonb_array_elements(p_batch) slot where slot->>'band' = 'detail') then
    raise exception 'invalid case version';
  end if;

  -- Serialize ingestion so opening/closing and the cursor advance are atomic.
  perform pg_advisory_xact_lock(307, 1);
  delete from public.national_rain_case_versions v using public.national_rain_cases c
    where v.slug = c.slug and c.details_expire_at <= now() and not c.permanent;
  select base_time into last_ingested from public.national_rain_case_cursor where id;
  if last_ingested >= p_base then return false; end if;

  for candidate in
    select distinct on (area->>'code') area, (slot->>'validTime')::timestamptz as valid_time
      from jsonb_array_elements(p_batch) slot
      cross join lateral jsonb_array_elements(slot->'municipalities') area
      where slot->>'band' = 'detail' and (area->>'minimumMmPerHour')::int in (30,50,80)
        and area->>'basetime' = to_char(p_base at time zone 'UTC', 'YYYYMMDDHH24MISS')
      order by area->>'code', (slot->>'validTime')::timestamptz
  loop
    insert into public.national_rain_cases
      (slug, municipality_code, prefecture, municipality, first_base, first_valid_time,
       last_base, peak_tier, peak_valid_time)
    values (
      (candidate.area->>'code') || '-' || to_char(p_base at time zone 'Asia/Tokyo', 'YYYYMMDD-HH24MI'),
      candidate.area->>'code', candidate.area->>'prefecture', candidate.area->>'municipality',
      p_base, candidate.valid_time, p_base, (candidate.area->>'minimumMmPerHour')::smallint, candidate.valid_time)
    on conflict do nothing;
  end loop;

  for incident in select * from public.national_rain_cases where status = 'forecast'
  loop
    select jsonb_agg(jsonb_build_object(
      'validTime', slot->>'validTime', 'band', slot->>'band',
      'state', case when hit.area is not null then 'rain'
                    when slot->>'complete' = 'true' then 'below' else 'unknown' end,
      'tier', (hit.area->>'minimumMmPerHour')::smallint, 'basetime', hit.area->>'basetime',
      'radarTile', hit.area->'radarTile', 'tileCoverage', slot->'tileCoverage'
    ) order by slot->>'validTime') into episode_slots
    from jsonb_array_elements(p_batch) slot
    left join lateral (
      select area from jsonb_array_elements(slot->'municipalities') area
        where area->>'code' = incident.municipality_code
        order by (area->>'minimumMmPerHour')::smallint desc limit 1
    ) hit on true;

    select case when bool_or(slot->>'state' = 'rain') then 'rain'
                when bool_and(slot->>'state' = 'below') then 'below' else 'unknown' end
      into episode_state from jsonb_array_elements(episode_slots) slot where slot->>'band' = 'detail';

    select (slot->>'tier')::smallint, (slot->>'validTime')::timestamptz into version_peak, version_peak_time
      from jsonb_array_elements(episode_slots) slot where slot->>'tier' is not null
      order by (slot->>'tier')::smallint desc, (slot->>'validTime')::timestamptz limit 1;

    select exists (select 1 from public.national_rain_case_versions
      where slug = incident.slug and base_time = p_base - interval '5 minutes' and detail_state = 'below')
      into prior_dry;
    insert into public.national_rain_case_versions (slug, base_time, detail_state, peak_tier, peak_valid_time, slots)
      values (incident.slug, p_base, episode_state, version_peak, version_peak_time, episode_slots);
    update public.national_rain_cases set
      last_base = p_base,
      peak_tier = greatest(incident.peak_tier, version_peak),
      peak_valid_time = case when version_peak > incident.peak_tier then version_peak_time
                        when version_peak = incident.peak_tier then least(incident.peak_valid_time, version_peak_time)
                        else incident.peak_valid_time end,
      status = case when episode_state = 'below' and prior_dry then 'ended' else 'forecast' end,
      ended_at = case when episode_state = 'below' and prior_dry then p_base end,
      details_expire_at = case when episode_state = 'below' and prior_dry
        and greatest(incident.peak_tier, version_peak) = 30 then p_base + interval '7 days' end
      where slug = incident.slug;
  end loop;

  insert into public.national_rain_case_cursor (id, base_time) values (true, p_base)
    on conflict (id) do update set base_time = excluded.base_time;
  return true;
end;
$$;

-- Input is an operator-verified municipal radar series at exact forecast-valid
-- times. Null/unprovided observations remain unknown. This RPC does not fetch
-- an observation feed or infer rain from tile availability.
create function public.verify_national_rain_case(p_slug text, p_method text, p_observations jsonb)
returns void language plpgsql set search_path = '' as $$
declare
  incident public.national_rain_cases%rowtype;
  matched integer;
  different integer;
  unknown integer;
begin
  select * into strict incident from public.national_rain_cases where slug = p_slug for update;
  if incident.status = 'forecast' or coalesce(trim(p_method), '') = ''
     or jsonb_typeof(p_observations) is distinct from 'object'
     or exists (select 1 from jsonb_each(p_observations) o where o.value::text not in ('null','0','30','50','80')) then
    raise exception 'invalid case verification';
  end if;
  update public.national_rain_case_versions v set verification = (
    select jsonb_agg(jsonb_build_object(
      'validTime', slot->>'validTime', 'band', slot->>'band',
      'observedTier', p_observations->(slot->>'validTime'),
      'result', case
        when slot->>'state' = 'unknown' or p_observations->>(slot->>'validTime') is null then 'unknown'
        when coalesce((slot->>'tier')::int, 0) = (p_observations->>(slot->>'validTime'))::int then 'match'
        else 'different' end
    ) order by slot->>'validTime') from jsonb_array_elements(v.slots) slot
  ) where v.slug = p_slug;
  if not found then raise exception 'no retained case detail'; end if;

  -- Count each valid time once, using its most recent issued forecast.
  with latest as (
    select distinct on (entry->>'validTime') entry
      from public.national_rain_case_versions v cross join lateral jsonb_array_elements(v.verification) entry
      where v.slug = p_slug order by entry->>'validTime', v.base_time desc
  )
  select count(*) filter (where entry->>'result' = 'match'),
         count(*) filter (where entry->>'result' = 'different'),
         count(*) filter (where entry->>'result' = 'unknown')
    into matched, different, unknown from latest;
  update public.national_rain_cases set
    status = case when matched + different > 0 then 'verified' else 'ended' end,
    verification_summary = jsonb_build_object(
      'method', p_method, 'match', matched, 'different', different, 'unknown', unknown
    )
    where slug = p_slug;
end;
$$;

revoke all on function public.ingest_national_rain_case_version(timestamptz, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.verify_national_rain_case(text, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.ingest_national_rain_case_version(timestamptz, jsonb) to service_role;
grant execute on function public.verify_national_rain_case(text, text, jsonb) to service_role;
