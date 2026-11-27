begin;
do $$
declare
  base timestamptz := '2026-11-25 12:05Z';
  values_tier int[] := array[30,30,30,50,50,30,30,80,50,80,80,30];
  i integer;
  p jsonb;
  s text := '17384-20261125-2105';
  extended_only jsonb;
  first_target text := '2026-11-25T12:10:00.000Z';
begin
  extended_only := jsonb_build_array(
    jsonb_build_object('band','detail','validTime',first_target,'complete',true,'municipalities','[]'::jsonb),
    jsonb_build_object('band','extended','validTime','2026-11-25T12:35:00.000Z','complete',true,
      'municipalities',jsonb_build_array(jsonb_build_object('code','17384','basetime','20261125120000','minimumMmPerHour',50)))
  );
  perform public.ingest_national_rain_case_version(base - interval '5 minutes', extended_only);
  if exists (select 1 from public.national_rain_cases) then raise exception 'extended only opened a case'; end if;

  for i in 0..11 loop
    p := jsonb_build_array(jsonb_build_object(
      'band','detail','validTime',to_char((base + (i+1)*interval '5 minutes') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS".000Z"'),
      'complete',true,'tileCoverage','[]'::jsonb,
      'municipalities',jsonb_build_array(jsonb_build_object('code','17384','prefecture','石川県',
        'municipality','志賀町','minimumMmPerHour',values_tier[i+1],
        'basetime',to_char((base+i*interval '5 minutes') at time zone 'UTC','YYYYMMDDHH24MISS')))
    ));
    if not public.ingest_national_rain_case_version(base+i*interval '5 minutes', p) then raise exception 'new batch rejected'; end if;
    if public.ingest_national_rain_case_version(base+i*interval '5 minutes', p) then raise exception 'duplicate accepted'; end if;
  end loop;
  if (select count(*) from public.national_rain_cases) <> 1 or
     (select count(*) from public.national_rain_case_versions where slug=s) <> 12 or
     not exists (select 1 from public.national_rain_cases where slug=s and permanent and peak_tier=80) then
    raise exception 'Shika progression/uniqueness failed';
  end if;

  for i in 12..16 loop
    p := jsonb_build_array(jsonb_build_object('band','detail',
      'validTime',to_char((base+(i+1)*interval '5 minutes') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS".000Z"'),
      'complete',i<>13,'municipalities','[]'::jsonb));
    if i=15 then
      p := jsonb_set(p, '{0,municipalities}', jsonb_build_array(jsonb_build_object('code','17384','prefecture','石川県',
        'municipality','志賀町','minimumMmPerHour',30,
        'basetime',to_char((base+i*interval '5 minutes') at time zone 'UTC','YYYYMMDDHH24MISS'))));
    end if;
    perform public.ingest_national_rain_case_version(base+i*interval '5 minutes',p);
    if not exists (select 1 from public.national_rain_cases where slug=s and status='forecast') then
      raise exception 'unknown or intervening rain ended the case';
    end if;
  end loop;

  perform public.ingest_national_rain_case_version(base+17*interval '5 minutes',
    jsonb_build_array(jsonb_build_object('band','detail','validTime','2026-11-25T13:35:00.000Z','complete',true,'municipalities','[]'::jsonb)));
  if not exists (select 1 from public.national_rain_cases where slug=s and status='ended' and details_expire_at is null) then
    raise exception 'two dry versions did not end the permanent case';
  end if;
  perform public.verify_national_rain_case(s,'Municipal radar maximum (isolated fixture)',
    jsonb_build_object(first_target,30));
  if not exists (select 1 from public.national_rain_cases where slug=s and status='verified'
    and (verification_summary->>'match')::int=1 and (verification_summary->>'unknown')::int>0) then
    raise exception 'verification did not preserve unknown and matched observations';
  end if;
end $$;

do $$
declare
  b timestamptz := '2026-11-26 01:00Z';
  s text := '12207-20261126-1000';
  p jsonb;
  i integer;
begin
  p := jsonb_build_array(jsonb_build_object('band','detail','validTime','2026-11-26T01:05:00.000Z',
    'complete',true,'municipalities',jsonb_build_array(jsonb_build_object(
      'code','12207','prefecture','千葉県','municipality','松戸市','minimumMmPerHour',30,'basetime','20261126010000'))));
  perform public.ingest_national_rain_case_version(b,p);
  for i in 1..2 loop
    perform public.ingest_national_rain_case_version(b+i*interval '5 minutes',
      jsonb_build_array(jsonb_build_object('band','detail','validTime','2026-11-26T01:20:00.000Z','complete',true,'municipalities','[]'::jsonb)));
  end loop;
  if not exists (select 1 from public.national_rain_cases where slug=s and status='ended'
      and not permanent and details_expire_at=ended_at+interval '7 days') then raise exception 'retention not assigned'; end if;
  update public.national_rain_cases set details_expire_at=now()-interval '1 minute' where slug=s;
  perform public.ingest_national_rain_case_version(b+interval '10 minutes',
    jsonb_build_array(jsonb_build_object('band','detail','validTime','2026-11-26T01:20:00.000Z','complete',true,'municipalities','[]'::jsonb)));
  if exists (select 1 from public.national_rain_case_versions where slug=s)
     or not exists (select 1 from public.national_rain_cases where slug=s)
     or not exists (select 1 from public.national_rain_case_versions where slug='17384-20261125-2105') then raise exception 'retention layers failed'; end if;
  if has_table_privilege('anon', 'public.national_rain_cases', 'select')
     or has_function_privilege('authenticated', 'public.ingest_national_rain_case_version(timestamptz,jsonb)', 'execute')
     or not has_function_privilege('service_role', 'public.verify_national_rain_case(text,text,jsonb)', 'execute') then
    raise exception 'case privileges are incorrect';
  end if;
end $$;
rollback;
