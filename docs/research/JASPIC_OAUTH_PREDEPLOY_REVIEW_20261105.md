# JASPIC OAuth pre-deployment security review (2026-11-05)

**NOT APPROVED FOR PRODUCTION.** Draft PR #155 remains open and unmerged.
The owner has set the Supabase redirect URL and Site URL; the intended email account was found in Supabase Auth and is email-confirmed.

## Verified facts

- PR #155 currently changes 111 files, mixing OAuth with the police-alert processing migration. Merging it would deploy much more than the login feature.
- iPhone login UI is staged on the draft branch but has never been deployed.
- The admin-verified start POST is gated by JASPIC_OAUTH_START_ENABLED=true; the callback that exchanges a Google authorization code is separately gated by JASPIC_OAUTH_CALLBACK_ENABLED=true.
- One-use OAuth state and token vault SQL are staged in review-only migrations. Neither migration has been applied to production.
- Existing Vercel production variables include NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. JASPIC OAuth-specific secrets are not configured.
- CI passes unit/mocked tests; it does not verify live Supabase login, real database transaction concurrency, or actual Google OAuth.

## Blocking items

1. Split OAuth-only code/tests into an independently reviewable Draft PR against latest main. Do not merge or deploy the entire #155 just to get an admin login page.
2. Callback verifies the owner ID bound into an encrypted cookie but does not independently verify a *current* authenticated Supabase admin session. Review cookie theft and login-CSRF assumptions, or add durable server admin session.
3. Gmail token response checks gmail.send scope but does not establish that the Google account is actually the expected sender. A protected operator confirmation or appropriately authorized identity check is needed.
4. Apply and integration-test one-use state and encrypted token vault migrations only after separate authorization. Validate DB transaction atomicity under concurrency and restrictive table/RPC grants.
5. Configure Google web client secret, Supabase service-role key, encryption keys and admin allowlist only in server-side Vercel settings. Never publish values in GitHub, UI, chats, logs or screenshots.
6. Verify iPhone email magic-link login actually works with the new Site URL and redirect allowlist. The previous invitation redirected to localhost; no new real iPhone test has been observed.
7. Verify hosting/proxy request logs cannot expose the Google authorization code contained in incoming callback query strings. A 303 redirect after receiving the URL is not sufficient redaction.
8. Implement and verify rate limiting, token revocation/rotation, fail-closed errors and secure session-cookie behaviour. Existing tests cover only mocks.
9. Obtain separate owner approvals for DB schema, disabled OAuth-only deployment, and later OAuth activation. None authorize Gmail sending, 18:00 cron, or deactivation of old Windows PC.

## Immediate operator action

No new invitation is needed. Owner can wait for independent OAuth security review, and then set server-only variables privately and explicitly approve isolated schema/deployment steps. Keep BOTH OAuth flags false; no live Google authorization or Gmail API mail sending.

## 2026-11-06 offline follow-up (not deployed)

A sender-identity guard has now been added to the **Draft #155 source only**:
request `openid email gmail.send`, require these scopes in the token response,
GET the fixed Google OIDC UserInfo endpoint using the short-lived access token,
and refuse vault persistence unless `email_verified === true` and the
Google email exactly matches the server-side expected sender (case-insensitive).
The verified Google subject is parsed for potential future pinning but is not
yet durably pinned; consider first-time administrative enrollment controls.
Tests cover wrong/unverified/missing Google identity and missing scopes.
This is **not** permission to activate consent. No network Google call was run.

The owner authorized and the Supabase migration API successfully created both
OAuth tables in production on 2026-11-06 (see
`JASPIC_OAUTH_DB_APPLIED_20261106.md`). Their RLS/grants and empty initial
rows were verified. The earlier blocker “schema unapplied” is now resolved;
production UI deploy and callback security review are still outstanding.

Google documentation used for OIDC userinfo design:
https://developers.google.com/identity/openid-connect/reference
