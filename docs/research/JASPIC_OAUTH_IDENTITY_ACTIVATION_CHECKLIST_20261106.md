# JASPIC OAuth identity-only activation checklist (2026-11-06)

## Current status
- Offline consent, sealed session, atomic state adapter, callback preparation and tests are staged in Draft PR #168.
- The production start route still returns HTTP 503. The UI button remains disabled. No callback HTTP route is connected on this branch.
- Google web client ID and secret exist in Vercel Production; this alone does not activate OAuth.
- No Gmail send scope is requested in the identity-only implementation. **Identity consent cannot authorize Gmail sending.**

## Required before activation
1. Verify the production Supabase RPC `jaspic_consume_gmail_oauth_state` and table `jaspic_gmail_oauth_states` match the adapter, including atomic consume, expiry, owner binding, and RLS.
2. Add server-only `JASPIC_OAUTH_COOKIE_KEY` (32 random bytes, base64url) and restricted Supabase service-role credentials; never expose either to browser code or logs.
3. Wire POST /jaspic/oauth/start to the verified Supabase user, canonical admin UID **and** app_metadata.jaspic_role=admin; use strict Origin, short-lived sealed HttpOnly cookie, and persistent one-use state. Do not activate on GET.
4. Wire callback to validate the encrypted owner-bound cookie, exact callback origin/path, one-time state consumption before code exchange, and verified Google account email. Clear cookie on success and failure. Never return tokens or authorization codes to client.
5. For identity-only flow, discard Google access/refresh tokens after verifying identity; store only a minimal verified result if required. Keep all Gmail sending paths disabled.
6. Run end-to-end negative tests: unauthenticated user, spoofed metadata, invalid origin, expired cookie, replayed state, concurrent callbacks, wrong Google account, Google error, DB outage, missing secrets.
7. Review feature gates separately for start and callback; do not enable until both routes and rollback behavior are verified.
8. Enable identity consent in a controlled deployment only after explicit review. Gmail send consent and any real mail dispatch require a separate implementation and authorization.

## Deployment rule
Draft PR #155 remains untouched. Do not merge PR #168, deploy production, activate flags, or send mail as part of this checklist.
