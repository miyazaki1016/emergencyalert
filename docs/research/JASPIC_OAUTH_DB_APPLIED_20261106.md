# JASPIC OAuth DB schema applied — 2026-11-06

## Production change (owner explicitly approved)

Project: EmergencyAlert, Supabase project `yqyevipvkdwmhcaxywes`.

Applied exactly the existing SQL from Draft PR #155 through Supabase migration API:
- `20261105074100_jaspic_oauth_once`: public.jaspic_gmail_oauth_states and public.jaspic_consume_gmail_oauth_state(text,text).
- `20261105074500_jaspic_gmail_token_vault`: public.jaspic_gmail_oauth_vault.

Both migrations returned success. Post-apply **read-only** verification:
- Both tables exist and have RLS enabled.
- Neither anon nor authenticated roles have SELECT permission; service_role does.
- Only service_role may EXECUTE the consume RPC; anon and authenticated may not.
- Both tables contain **zero rows** (no Gmail tokens, authorization states or account credentials have been stored).

## Boundaries

This is only a database schema change. No Vercel build, deploy, OAuth activation, Google authorization, Gmail send or cron run was performed. Login-only PR #157 is already merged, but its production deployment has not been verified; OAuth functions in Draft PR #155 remain unmerged. The Vercel Free deployment quota remains a separate blocker.

## Follow-up

- Keep both JASPIC_OAUTH_START_ENABLED and JASPIC_OAUTH_CALLBACK_ENABLED disabled.
- Re-review the security of the server-side callback, account ownership verification, token lifecycle/rotation and restricted credentials before the OAuth endpoints are promoted. The DB schema's existence is NOT authorization to start OAuth or send mail.
- On Vercel quota availability, verify the login-only deployment and iPhone email-signin first.
- Existing Windows mail process remains unchanged.
