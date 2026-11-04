# JASPIC iPhone Gmail OAuth — owner action checklist (2026-11-05)

> **Review only.** Draft PR #155. No real Gmail sending, scheduled mail delivery,
> Gmail send test, live OAuth, production Supabase migration, production
> deployment, or stopping the Windows system is authorized by this document.

## Implemented in Draft PR #155

- Public info and privacy pages were merged separately in PR #156; do not duplicate.
- iPhone Safari email magic-link login via Supabase Auth client.
- Server-side identity verification via Supabase Auth `getUser`, admin ID and verified-email allowlist.
- Owner-only POST `/jaspic/oauth/start`: random state/PKCE, AES-GCM sealed HttpOnly cookie, persistent one-use state registration, consent link.
- Owner-bound callback `/jaspic/oauth/callback`: validates cookie/state and atomic consumption, Google code exchange, validates `gmail.send` and refresh token, encrypts token, saves envelope in restricted vault.
- Callback always redirects to a clean result URL, strips code/state, disables caching/referrers.
- **Both OAuth start and callback remain OFF by default** (independent feature flags).
- All token, auth and DB work must be thoroughly reviewed and integration tested before enabling.
- Gmail API *sending* is never called by the OAuth routes.

## Owner-only configuration still required (DO NOT paste secrets into a chat)

### 1. Supabase Auth

- Confirm the user has a genuine Supabase Auth account with verified email and known UUID.
- Enable email OTP / magic-link sign in on that Supabase project.
- Add `https://emergencyalert.news/jaspic/oauth` to the Supabase Auth redirect URL allowlist.
- Verify the email link opens in iPhone Safari and returns to that page.
- The admin subject ID must be the **Supabase Auth user ID**, not a Gmail address or Google client ID.

### 2. Google Cloud

- Use the newly created **Web application** client in the current JASPIC Google Cloud project.
- Redirect URI must be exactly `https://emergencyalert.news/jaspic/oauth/callback`.
- Allow only intended account and Google `gmail.send` scope; a Google verification warning may remain depending on personal-use eligibility.
- Keep previous **Desktop application** client as-is.

### 3. Vercel project (server-side environment values)

All of these must be set for the correct Vercel project and production environment,
without posting values to GitHub, chat, issue comments or screenshots:

| Variable | Source | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role secret | **yes** |
| `JASPIC_OAUTH_ADMIN_SUBJECT` | Verified Supabase Auth user UUID | confidential |
| `JASPIC_OAUTH_ADMIN_EMAIL` | Verified Supabase Auth email | confidential |
| `JASPIC_GOOGLE_WEB_CLIENT_ID` | New Web application client ID | public identifier |
| `JASPIC_GOOGLE_WEB_CLIENT_SECRET` | New Web application client secret | **yes** |
| `JASPIC_OAUTH_COOKIE_KEY` | Random 32-byte key, base64url without padding | **yes** |
| `JASPIC_OAUTH_TOKEN_KEY` | Independent random 32-byte key, base64url without padding | **yes** |
| `JASPIC_OAUTH_TOKEN_KEY_ID` | E.g. `vault_2026_11` | identifier |

**Do not set** `JASPIC_OAUTH_START_ENABLED=true` or
`JASPIC_OAUTH_CALLBACK_ENABLED=true` until:
1. SQL migrations have received separate approval and been applied with an actual Postgres concurrency/RLS integration test.
2. Server routes, error handling, token vault, authentication, Google redirect, and logging have passed independent security review.
3. The staged code has passed CI and been separately approved for a guarded deploy.
4. OAuth-only activation is explicitly approved, **without** authorizing Gmail sending.

### 4. Database

Review two migrations in order:
- `supabase/migrations/20261105074100_jaspic_oauth_once.sql`
- `supabase/migrations/20261105074500_jaspic_gmail_token_vault.sql`

Both are new, restricted tables. No production SQL has yet been executed.
Verify existing migration numbering and schema before using them.

### 5. Separate future authorization

After the owner configures the above privately, request **explicit approval** for
the reviewed Supabase migrations and subsequently the OAuth-only deployment.
Neither permission implies authorization to send mail, change cron, deactivate
the Windows process, or merge the entire Draft PR #155.

## Known limitations and review gates

- Supabase Auth magic-link delivery and project redirect allowlist are not yet verified in the owner's account.
- The deployed website still has only the public JASPIC pages from PR #156; the protected admin UI in PR #155 has not been deployed.
- No real database concurrency test has been performed.
- No real Google OAuth callback or token exchange has been tested.
- Sensitive callback URLs may be logged automatically by the hosting infrastructure; verify redaction and request-log policy before activation.
- OTP/login screen and OAuth start endpoint must undergo rate-limit and CSRF/security review.
- No automated key rotation/refresh-token invalidation procedure has been deployed.
