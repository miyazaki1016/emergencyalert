create table public.national_rain_forecast_tile_versions (
  valid_time text not null check (valid_time ~ '^[0-9]{14}$'),
  base_time text not null check (base_time ~ '^[0-9]{14}$' and base_time < valid_time),
  extended boolean not null,
  x smallint not null check (x between 13 and 14),
  y smallint not null check (y between 5 and 7),
  payload jsonb check (payload is null or (
    jsonb_typeof(payload->'pending') is not distinct from 'array'
    and jsonb_typeof(payload->'tiles') is not distinct from 'object'
  )),
  updated_at timestamptz not null default now(),
  primary key (valid_time, base_time, extended, x, y)
);
alter table public.national_rain_forecast_tile_versions enable row level security;
revoke all on public.national_rain_forecast_tile_versions from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.national_rain_forecast_tile_versions to service_role;
