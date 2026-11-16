begin;

create table if not exists public.national_rain_forecast_snapshot (
  id smallint primary key check (id = 1),
  basetime text not null check (basetime ~ '^[0-9]{14}$'),
  payload jsonb not null,
  published_at timestamptz not null
);
alter table public.national_rain_forecast_snapshot enable row level security;
revoke all on public.national_rain_forecast_snapshot from public, anon, authenticated, service_role;
grant select on public.national_rain_forecast_snapshot to service_role;

create or replace function public.publish_national_rain_forecast(p_snapshot jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := p_snapshot->>'basetime';
  base_at timestamptz;
begin
  if base is null or base !~ '^[0-9]{14}$'
     or p_snapshot->>'source' is distinct from 'JMA'
     or p_snapshot->>'n03Version' is distinct from '20260101'
     or jsonb_typeof(p_snapshot->'frames') is distinct from 'array' then
    raise exception 'Invalid forecast snapshot';
  end if;
  if jsonb_array_length(p_snapshot->'frames') <> 6 then
    raise exception 'Incomplete forecast snapshot';
  end if;

  if p_snapshot ? 'extendedFrames' then
    if jsonb_typeof(p_snapshot->'extendedFrames') is distinct from 'array'
       or jsonb_array_length(p_snapshot->'extendedFrames') <> 6 then
      raise exception 'Incomplete extended forecast snapshot';
    end if;
  end if;

  base_at := make_timestamptz(substring(base, 1, 4)::integer,
    substring(base, 5, 2)::integer, substring(base, 7, 2)::integer,
    substring(base, 9, 2)::integer, substring(base, 11, 2)::integer,
    substring(base, 13, 2)::integer, 'UTC');

  -- Serialize the age check and write even when the singleton does not exist yet.
  perform pg_advisory_xact_lock(250, 1);
  if base_at > clock_timestamp() or base_at + interval '10 minutes' <= clock_timestamp() then
    raise exception 'Expired or future forecast snapshot';
  end if;

  insert into public.national_rain_forecast_snapshot as snapshot (id, basetime, payload, published_at)
  values (1, base, p_snapshot, clock_timestamp())
  on conflict (id) do update set basetime = excluded.basetime,
    payload = excluded.payload, published_at = excluded.published_at
  where excluded.basetime > snapshot.basetime
    or (excluded.basetime = snapshot.basetime
      and excluded.payload ? 'extendedFrames'
      and not (snapshot.payload ? 'extendedFrames')
      and excluded.payload - 'extendedFrames' = snapshot.payload);
  return found;
end;
$$;

revoke all on function public.publish_national_rain_forecast(jsonb) from public, anon, authenticated;
grant execute on function public.publish_national_rain_forecast(jsonb) to service_role;
commit;
