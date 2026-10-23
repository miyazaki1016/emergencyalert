# Anonymous auth persistence: storage key inventory

2026-10-24: iPhone standalone PWA reports "セッションなし" and "認証保存キーなし" after production PR #81. PR #81 only checks the expected default Supabase auth storage key derived from NEXT_PUBLIC_SUPABASE_URL. This does **not** prove all auth storage is absent.

This follow-up counts localStorage key **names** matching `sb-*-auth-token` and total key count. It does not display names, read values, inspect JWTs, call auth APIs, write storage, send telemetry, or change anonymous identity. It is opt-in and appears only in the existing diagnostics panel.

Interpretation: zero matching keys with zero session strengthens lost-local-session hypothesis, but Safari PWA storage scope, alternate storageKey and auth persistence must still be considered. Nonzero matching keys but expected key absent indicates possible project ref/storage-key mismatch. No automatic sign-in, data migration, old-account cleanup or credential recovery without secure identity verification.

Next after deployment: obtain new diagnostic report from user; compare key counts with expected client settings; preserve current five watch targets and subscription.
