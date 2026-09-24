# watch-rain

This directory mirrors the production Supabase Edge Function source.

Baseline: deployed production `watch-rain` v8, captured 2026-09-24.

Operational rule:
- GitHub is the source of truth for future changes.
- Do not edit the production Edge Function ad hoc.
- Change here via PR and tests first, then deploy the reviewed source to Supabase.
- The current production function uses custom `WATCH_CRON_TOKEN` authentication and therefore has Supabase `verify_jwt=false`.
- Never commit secret values such as `WATCH_CRON_TOKEN` or `VAPID_PRIVATE_KEY`.

The VAPID public key is currently present in the function source because that matches deployed v8. A later hardening step will rotate VAPID credentials and remove the historical exposed private key from active use.
