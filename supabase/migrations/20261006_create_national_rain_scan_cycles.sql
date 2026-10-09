-- PR #59 proof state only. DO NOT apply to Production until explicitly reviewed.
-- Records whether a JMA nationwide forecast basetime has been completely scanned.
-- Separate from watch_targets, Push, and user-facing notification state.

create table if not exists public.national_rain_scan_cycles (
  basetime timestamptz primary key,
  status text not null check (status in ('INCOMPLETE','COMPLETED')),
  required_frames integer not null default 0 check (required_frames >= 0),
  usable_frames integer not null default 0 check (usable_frames >= 0 and usable_frames <= required_frames),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.national_rain_scan_cycles is
  'Proof-only nationwide rain scan cycle state. A basetime is COMPLETED only after every required forecast frame is usable and queue writes succeed.';

create index if not exists national_rain_scan_cycles_completed_idx
  on public.national_rain_scan_cycles (status, basetime desc);

revoke all on table public.national_rain_scan_cycles from public, anon, authenticated;
grant select, insert, update on table public.national_rain_scan_cycles to service_role;
