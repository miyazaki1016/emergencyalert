do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
end $$;

\ir ../../docs/sql/national-rain-forecast-snapshot.sql

do $$
declare
  current_base text := to_char(clock_timestamp() at time zone 'UTC' - interval '1 minute', 'YYYYMMDDHH24MISS');
  older_base text := to_char(clock_timestamp() at time zone 'UTC' - interval '2 minutes', 'YYYYMMDDHH24MISS');
  expired_base text := to_char(clock_timestamp() at time zone 'UTC' - interval '11 minutes', 'YYYYMMDDHH24MISS');
  snapshot jsonb := '{"source":"JMA","n03Version":"20260101","frames":[{},{},{},{},{},{}]}'::jsonb;
begin
  if has_function_privilege('anon', 'public.publish_national_rain_forecast(jsonb)', 'EXECUTE')
     or has_table_privilege('authenticated', 'public.national_rain_forecast_snapshot', 'SELECT')
     or has_table_privilege('service_role', 'public.national_rain_forecast_snapshot', 'UPDATE') then
    raise exception 'Unexpected forecast privileges';
  end if;
  if not public.publish_national_rain_forecast(snapshot || jsonb_build_object('basetime', current_base))
     or public.publish_national_rain_forecast(snapshot || jsonb_build_object('basetime', current_base))
     or public.publish_national_rain_forecast(snapshot || jsonb_build_object('basetime', older_base))
     or (select basetime from public.national_rain_forecast_snapshot where id = 1) <> current_base then
    raise exception 'Forecast monotonicity failed';
  end if;
  begin
    perform public.publish_national_rain_forecast(snapshot || jsonb_build_object('basetime', expired_base));
    raise exception 'Expired forecast was accepted';
  exception when raise_exception then
    if sqlerrm <> 'Expired or future forecast snapshot' then raise; end if;
  end;
end $$;
