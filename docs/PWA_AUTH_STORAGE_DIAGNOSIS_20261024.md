# PWA anonymous session: read-only storage-key diagnosis (2026-10-24)

Observed: home-screen iPhone PWA is online, service worker controlled, history component mounted, but its Supabase getSession returns no session. Push registration verification also reports no auth session. Current owner still has five targets in database.

The earlier browser-client singleton fix is in production but did not recover the session.

New diagnostic: while opt-in panel is open, inspect **only the presence of the expected Supabase localStorage auth key**. Never call localStorage.getItem on auth key, parse tokens, reveal user IDs, send telemetry, sign in, sign out, or mutate Supabase data. Display "key present", "key absent" or "unavailable" next to the already existing session state. Include status in allowlisted copied report.

Interpretation:
- No key + no session: local persisted session missing from this PWA storage scope. Do not create a new anonymous account; design verified recovery.
- Key present + no session: possible expired/invalid credentials, refresh failure, or storage-client mismatch. Requires more diagnostics; key presence is not proof of valid session.
- Browser and standalone PWA may have distinct storage; inspect only the installed PWA.
- Keep old account data and current five targets untouched until resolved.

Acceptance: CI passes, production deployed, user opens panel and shares the two statuses. Avoid capturing sensitive details.
