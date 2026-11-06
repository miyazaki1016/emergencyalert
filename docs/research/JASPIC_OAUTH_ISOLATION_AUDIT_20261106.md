# JASPIC Gmail OAuth isolated rollout audit — 2026-11-06

Status: **RESEARCH ONLY — DO NOT ENABLE**. This document does not authorize Gmail OAuth, email transmission, or 18:00 scheduling.

## Verified baseline
- Production admin login and server-side status check are confirmed working on iPhone after PR #167.
- `app/jaspic/oauth/start/route.ts` on main deliberately returns 503 for both GET and POST.
- Draft PR #155 contains candidate Gmail callback and legacy-mail compatibility code. **Do not merge PR #155**; it is a broader migration.
- The main branch already has a fail-closed authorization helper requiring verified Supabase user ID equal to server-only `JASPIC_ADMIN_USER_ID` and `app_metadata.jaspic_role === "admin"`.

## Isolation boundaries for a future dedicated OAuth PR
1. Copy only necessary OAuth state, PKCE, owner-bound session, callback, token encryption, and minimal storage modules from the existing research branch; compare each file against main to avoid regressions.
2. POST /jaspic/oauth/start must validate a fresh Supabase bearer token via `auth.getUser(token)`, apply `isJaspicAdmin`, and reject unauthenticated/non-admin users **before** creating state. GET must remain disabled.
3. Validate exact registered callback origin and redirect URI; one-time, short-lived CSRF state; PKCE S256; secure, HttpOnly, SameSite=Lax session cookie; no tokens or secrets in browser, URL, logs, or source control.
4. Callback must validate state/cookie/owner and consume state once, then verify Google account identity before encrypting and storing refresh token with server-side key. Avoid storing access tokens unless essential.
5. Feature flag must default OFF on missing config. OAuth consent must remain OFF until a separate, explicit activation decision after testing.
6. No Gmail send scope unless proven required; separate any consent scope expansion from authorization enablement. **Never** connect callback to Gmail send, SMTP, or 18:00 scheduler.
7. Add offline tests: anonymous 401; non-admin 403; admin allow; missing env 503; CSRF replay; expired state; callback tampering; wrong Google account; vault write failure; no send or scheduling side effects.
8. Check production Vercel build quota before any merge. Do not trigger preview builds or extra production builds for documentation-only work.

## Remaining blockers before activation
- Audit the existing PR #155 candidate OAuth modules and SQL schema for compatibility with current main and Supabase RLS.
- Verify exact Google Cloud OAuth client type, authorized redirect URI, consent-screen testing/production status, and scopes. Never paste client secret into chat.
- Verify dedicated token-vault encryption key, key rotation and backup/rollback policy, and one-use state persistence.
- Obtain explicit approval for OAuth activation as a separate change; email sending remains disabled even after OAuth authorization.

## Rollback
Keep `JASPIC_GMAIL_OAUTH_ENABLED` default false. Disabling OAuth must immediately deny start/callback; revoke token and remove encrypted vault entry separately when needed. Existing Supabase admin login must continue working.


## Source-level findings from PR #155 (reviewed 2026-11-06)
- Candidate `app/jaspic/oauth/start/route.ts` uses `JASPIC_OAUTH_START_ENABLED`, checks exact Origin and bearer token, verifies the token via Supabase Auth, then uses the **separate** `JASPIC_OAUTH_ADMIN_SUBJECT` and `JASPIC_OAUTH_ADMIN_EMAIL` allowlist. This is not yet unified with main's `JASPIC_ADMIN_USER_ID` plus `app_metadata.jaspic_role` guard. **Must reconcile before extracting**; do not accidentally weaken the verified admin policy.
- Candidate `gmail-oauth-supabase-auth.ts` verifies ID, email and email confirmation but does not return or check `app_metadata`. The start route therefore cannot use main's existing `isJaspicAdmin` without changing the adapter or checking the Supabase user directly.
- Candidate start route builds a trusted issuer from `NEXT_PUBLIC_SUPABASE_URL` **without trimming a trailing slash**. Main's production login fixed that issue in PR #166; the extraction must normalize the URL to avoid issuer mismatch.
- Candidate callback uses a different flag, `JASPIC_OAUTH_CALLBACK_ENABLED`. Starting consent while callback is disabled would fail after the Google redirect; both must be controlled by an explicit, coherent rollout sequence.
- The candidate start route's `Origin` check is strict; browser fetch from the existing client should be verified against this requirement in offline tests, rather than assuming the header is present.
- Existing PR #155 records that the OAuth one-use state and token-vault tables were applied, with RLS enabled and zero records at the time of its report. **Current production DB state has not been rechecked in this audit.**
- Keep the existing `/jaspic/oauth/start` 503 implementation on main until a separate code-only extraction has passed tests and received activation approval.

### Extraction acceptance gates
1. Reuse `isJaspicAdmin` and a single `JASPIC_ADMIN_USER_ID`; require verified Supabase app metadata role. No separate email-only authorization path.
2. Normalize Supabase URL and test trailing slash.
3. Enforce one-use state, PKCE, exact callback URL, verified Google sender and encrypted token storage.
4. Keep all flags false and browser Gmail button disabled during extraction; tests should prove GET/POST remain 503 by default.
5. Never copy PR #155 mail transport, cron, or unrelated schema/code into the isolated PR.
