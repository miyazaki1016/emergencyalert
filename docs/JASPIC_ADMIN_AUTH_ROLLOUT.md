# JASPIC administrator authorization rollout

Status: implementation in Draft PR #167; **not enabled in production**.

## Required controls
- Server verifies each Supabase bearer token using `auth.getUser(token)`; a browser session alone is not authorization.
- Authorization requires both `JASPIC_ADMIN_USER_ID` (server-only Vercel production environment variable) matching the verified Supabase user ID and `auth.users.raw_app_meta_data.jaspic_role = "admin"`.
- Do not put the administrator ID in `NEXT_PUBLIC_*` or expose service-role credentials to browsers.
- Never trust email or `user_metadata` alone.
- Missing configuration or mismatched role must return 403. Missing/invalid bearer token returns 401.
- Gmail OAuth start remains HTTP 503. No email send, scheduling or OAuth consent may be enabled by this change.

## Safe rollout order
1. Confirm CI and review PR #167. Keep migration PR #155 separate and Draft.
2. Assign `jaspic_role: "admin"` only to the preverified administrator's `app_metadata` via an authorized admin operation. Preserve other metadata keys.
3. Configure `JASPIC_ADMIN_USER_ID` as an encrypted server-only Production environment variable in Vercel, matching that account.
4. Merge PR #167 only after review and build quota is available; one controlled production deployment.
5. Test unauthenticated (401), authenticated non-admin (403), and administrator (200) status from an actual iPhone browser. Verify Gmail start still returns 503.
6. Keep Gmail OAuth and actual sending disabled until separately approved.

## Rollback
Remove `JASPIC_ADMIN_USER_ID` or remove the `jaspic_role` app metadata; the status endpoint then fails closed. This does not affect existing Supabase Auth login.
