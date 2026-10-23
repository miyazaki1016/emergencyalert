# PWA auth session recovery checkpoint — 2026-10-24

## User-observed symptoms
- iPhone home-screen PWA reports "認証状態を確認できないよ。" on push registration check even after restart.
- Notification feedback reports "この通知を受け取った端末・アカウントで開いてね。" rather than the empty-history message.
- Five current-owner watch targets remain in Supabase, confirmed read-only.
- No old-owner cleanup or deletion has succeeded. **Pause old-owner cleanup until auth is recovered.**

## Root-cause candidate and minimal fix
- `lib/supabase/browser.ts` previously created a fresh Supabase client for **every call**.
- `NotificationFeedbackHistory` subscribes to auth state while `app/page.tsx` separately calls `getSession()` and `signInAnonymously()`. Multiple client instances can introduce redundant auth listeners and refresh races, especially around PWA resume.
- Switch to one module-scoped browser Supabase client per tab. This is a preventative fix, **not proof** of the cause and not a guarantee that an already-lost session can be restored.
- Do not automatically create a new anonymous account on missing session. Existing `ensureAnonymousSession` in registration still creates one only when user explicitly saves a new location; further protection is follow-up work.

## Acceptance checks
1. CI / TypeScript passes.
2. Home-screen PWA after deployment shows existing five targets and push registration check succeeds.
3. On background/resume, session remains available; feedback shows true empty-history message, not wrong-account message.
4. If session remains absent, do not re-register locations or reinstall PWA; investigate persistent auth storage and session refresh errors without overwriting account identity.
5. Verify end-to-end push separately before retiring duplicate old-owner subscription.
