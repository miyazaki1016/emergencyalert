# Anonymous authentication recovery security assessment — 2026-10-24

## Confirmed read-only evidence
- Installed iPhone PWA reports no auth session, expected Supabase localStorage key absent, zero `sb-*-auth-token` keys, and one localStorage key overall.
- Browser client uses `createClient(url, publishableKey)` without custom storageKey or auth persistence overrides. No current session.
- Auth user `d76b7b7a-2d0c-4246-b033-b8e68e97ee56` exists and is anonymous; five `watch_targets` still owned by this user.
- DB has one push subscription for that owner and one for previous anonymous owner `668834cc-4113-4db5-9abe-ad72153d8e8b`. A browser push subscription is NOT an authentication credential.
- `app/page.tsx` `ensureAnonymousSession()` calls `signInAnonymously()` if no session; used by `savePlace()`. Avoid saving new locations until deliberate migration/recovery plan.

## Security conclusions
- User ID, endpoint URL, push encryption keys, user agent, or matching push subscription **must not** authorize reauthentication, account takeover, or reassignment of watch targets.
- Do not mint a JWT for the old user or introduce a public recovery endpoint keyed by owner ID, subscription endpoint, or a client-provided value.
- No evidence of a surviving recovery factor (verified email, linked provider, valid refresh token) for this anonymous account. No safe direct recovery method established.
- Secure practical fallback: after explicit user approval, create a fresh anonymous account, verify its session, and manually re-register the five targets with user confirmation. If an administrative data migration is desired, require independent ownership proof and review access controls; no migration implemented.
- Consider future optional account linking or user-held recovery credentials, and a UI warning before anonymous session loss.
- Preserve all existing accounts, target rows, and push subscriptions. No DB writes or destructive operations during this assessment.

## Verification
- Read-only Supabase queries checked `auth.users`, `watch_targets` and `push_subscriptions`.
- Reviewed browser client, push verification and anonymous sign-in code paths.
