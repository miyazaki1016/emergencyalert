-- JASPIC Gmail OAuth: single-use state/owner gate (NOT APPLIED TO PRODUCTION)
-- Review-only migration in Draft PR #155; no mail sending or credentials.
-- This is not a replacement for server-side admin authentication.
create table if not exists public.jaspic_gmail_oauth_states (
  state_hash text primary key
    check (state_hash ~ '^[a-f0-9]{64}$'),
  owner_id text not null
    check (owner_id ~ '^[A-Za-z0-9_-]{8,128}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint jaspic_oauth_state_expiry_after_create check (expires_at > created_at)
);

comment on table public.jaspic_gmail_oauth_states is
  'JASPIC OAuth one-time CSRF state digests only. No token, code, PKCE verifier, or email address.';

alter table public.jaspic_gmail_oauth_states enable row level security;
revoke all on table public.jaspic_gmail_oauth_states from public, anon, authenticated;
grant select, insert, update, delete on table public.jaspic_gmail_oauth_states to service_role;

-- Atomic consume: only one concurrent caller can change consumed_at from NULL.
-- Return bool, not secret state; use only from authenticated server-side flow.
create or replace function public.jaspic_consume_gmail_oauth_state(
  p_state_hash text,
  p_owner_id text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_consumed boolean := false;
begin
  if p_state_hash !~ '^[a-f0-9]{64}$'
     or p_owner_id !~ '^[A-Za-z0-9_-]{8,128}$' then
    return false;
  end if;

  update public.jaspic_gmail_oauth_states
     set consumed_at = now()
   where state_hash = p_state_hash
     and owner_id = p_owner_id
     and consumed_at is null
     and expires_at > now()
  returning true into v_consumed;

  return coalesce(v_consumed, false);
end;
$$;

revoke all on function public.jaspic_consume_gmail_oauth_state(text,text) from public, anon, authenticated;
grant execute on function public.jaspic_consume_gmail_oauth_state(text,text) to service_role;

-- Optional maintenance only after review/approval: delete expired entries
-- without retaining OAuth state indefinitely. Do not schedule automatically.
-- delete from public.jaspic_gmail_oauth_states where expires_at < now() - interval '1 day';
