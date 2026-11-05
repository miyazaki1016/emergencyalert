# JASPIC OAuth — no-build readiness check (2026-11-06)

## Decision

Vercel production build is **blocked** by the Free deployment quota (last explicit POST to create a deployment returned HTTP 402, `api-deployments-free-per-day`, retry after ~24 hours). Avoid further create/redeploy calls until quota reset is independently observed. This document does not request or trigger deployment.

## Verified in read-only checks

- Login-only PR #157 was merged into `main` as commit `4d9281cdae239f1223714ef926e0aaeee06bed27`. The merged three-file scope provides a Supabase email-login UI, sets `shouldCreateUser:false` to avoid creating new admin registrations, and returns HTTP 503 from both Google OAuth start methods.
- GitHub CI and PR promotion classification succeeded on PR #157 before merge.
- No Vercel production deployment matching the PR #157 merge commit was visible at the prior post-merge check. No successful live URL test has been established; the existence of a main commit **does not** prove it was published.
- The draft JASPIC PR #155 remains separate; latest comparison with `main` shows 129 commits ahead and 9 commits behind. **Do not merge or fast-forward it**; unrelated current main changes must be preserved.
- Supabase EmergencyAlert migrations list ends at `20261104052937_jaspic_legacy_hiroshima_person_ids_rpc`. Proposed OAuth migrations `20261105074100` and `20261105074500` are absent.
- Independent read-only `to_regclass` check confirms **both** `public.jaspic_gmail_oauth_states` and `public.jaspic_gmail_oauth_vault` are absent from production. This is expected: only draft migrations, no token storage active.
- The login-only PR #157 does not require either proposed OAuth table, the service-role key, or a Google client secret. Testing login after deployment does not authorize token exchange or mail sending.

## Staged next steps; no Vercel usage now

1. Wait for quota to reset; inspect Vercel quota/usage and latest production deployment *without starting another build*. Do not infer reset simply because other older deployment records show READY.
2. Deploy **only the already merged login-only main change** when the quota is available and with the owner's prior authorization. Verify commit and READY status before recommending the owner use the URL.
3. On the owner's iPhone, request an OTP email for the existing admin account; verify redirected session on Safari and the Supabase Auth last sign-in timestamp. **Never post verification URLs or tokens to issue comments or chats.**
4. Independently security-review OAuth start/callback and migrations within Draft #155. Obtain separate approvals before migration and flag activation. Confirm Google account identity, callback credential/log policy, and server admin session security.
5. Do not activate any Gmail send transport, 18:00 cron, or disable the existing Windows workflow.

## Note on URLs

The Supabase Auth Site URL was reported updated to `https://emergencyalert.news`, and `https://emergencyalert.news/jaspic/oauth` was reported added under Redirect URLs. Those operator-reported settings have not yet been verified by a successful production browser login.
