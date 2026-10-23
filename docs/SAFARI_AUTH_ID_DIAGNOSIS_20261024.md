# Safari auth identity comparison — 2026-10-24

Confirmed by user:
- iPhone standalone PWA: session absent, Supabase auth keys 0, localStorage total 1, saved targets not visible.
- iPhone Safari: session present, expected Supabase auth key present, Supabase key count 1, localStorage total 1, but saved targets not visible.
- iPhone Chrome: session absent, Supabase auth keys 0, localStorage total 0, saved targets not visible.
- Supabase still has anonymous user d76b7b7a-2d0c-4246-b033-b8e68e97ee56 with 5 watch targets.

Question: does Safari's surviving session belong to d76b7b7a or a different user? This change emits and shows only the first eight hex characters of session.user.id in opt-in diagnostics. It never exposes session tokens, full user ID or refresh tokens, never signs in, changes owners or writes to DB. The short prefix is diagnostic metadata, not authentication proof.

Acceptance: Safari reports prefix d76b7b7a (investigate target loading/RLS) or another prefix (different account; do not claim recovered). Safari session must be preserved.
