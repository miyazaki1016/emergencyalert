-- REVIEW ONLY: do not apply before independent admin auth and token rotation are reviewed.
-- Only encrypted Gmail OAuth token envelope metadata; NEVER plaintext credentials.
create table if not exists public.jaspic_gmail_oauth_vault (
  owner_id text primary key
    check (owner_id ~ '^[A-Za-z0-9_-]{8,128}$'),
  key_id text not null
    check (key_id ~ '^[A-Za-z0-9_-]{4,64}$'),
  encrypted_token jsonb not null
    check (
      jsonb_typeof(encrypted_token) = 'object'
      and encrypted_token ?& array['version', 'keyId', 'iv', 'ciphertext']
      and encrypted_token->>'version' = '1'
      and encrypted_token->>'keyId' = key_id
      and length(encrypted_token->>'iv') between 16 and 64
      and length(encrypted_token->>'ciphertext') between 32 and 8192
    ),
  saved_at timestamptz not null default now(),
  revoked_at timestamptz
);

comment on table public.jaspic_gmail_oauth_vault is
  'Encrypted JASPIC Gmail refresh token envelopes only. No plaintext client secrets, no OAuth access token.';

alter table public.jaspic_gmail_oauth_vault enable row level security;
revoke all on table public.jaspic_gmail_oauth_vault from public, anon, authenticated;
grant select, insert, update, delete on table public.jaspic_gmail_oauth_vault to service_role;

-- No cron, extension, trigger, transport, or OAuth exchange enabled.
