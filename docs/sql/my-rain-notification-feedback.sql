-- MYアメふる: user-reported weather for an actually delivered notification.
-- Apply only after reviewing notification_deliveries ownership and primary key types.
create table if not exists public.rain_notification_feedback (
  notification_id bigint primary key references public.notification_deliveries(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  actual_weather text not null check (actual_weather in ('RAINED','DID_NOT_RAIN','ALREADY_RAINING','STOPPED','DID_NOT_STOP','ALREADY_DRY','UNKNOWN')),
  updated_at timestamptz not null default now()
);
create index if not exists rain_notification_feedback_owner_idx on public.rain_notification_feedback(owner_id);
alter table public.rain_notification_feedback enable row level security;
revoke all on public.rain_notification_feedback from anon;
grant select, insert, update on public.rain_notification_feedback to authenticated;
drop policy if exists "read own feedback" on public.rain_notification_feedback;
create policy "read own feedback" on public.rain_notification_feedback
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "insert feedback for own delivery" on public.rain_notification_feedback;
create policy "insert feedback for own delivery" on public.rain_notification_feedback
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.notification_deliveries d
      where d.id = notification_id and d.owner_id = (select auth.uid()))
  );
drop policy if exists "update own feedback" on public.rain_notification_feedback;
create policy "update own feedback" on public.rain_notification_feedback
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.notification_deliveries d
      where d.id = notification_id and d.owner_id = (select auth.uid()))
  );
