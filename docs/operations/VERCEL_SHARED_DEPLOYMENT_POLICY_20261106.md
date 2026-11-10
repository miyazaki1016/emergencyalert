# Vercel shared deployment operating policy (draft, 2026-11-06)

Scope: KISHIBOJIM Hobby team, projects `misaki` and `emergencyalert`. This is an operational proposal, not an enabled gate.

## Separation of duties
- Develop and review on GitHub branches; run offline tests with GitHub Actions. Do not trigger Vercel preview builds by default.
- Do not equate GitHub CI success with deployed-site verification.
- Batch approved production changes; deploy only when needed, with rollback plan and a reserved emergency margin.
- Changes to `main` may trigger production builds. Docs-only changes should use existing build guards, but confirm behavior rather than assuming no quota impact.
- Keep production service available when deployment automation is paused. Never delete or roll back a live deployment just to conserve quota.

## Observability before enforcement
- Use read-only API requests. Verify that both project IDs belong to team `team_VIfp8TXktY4DegRNpPhFb5uT`.
- Known project IDs: `misaki=prj_71NgSxGkNXkKECXc9jJRrJHdAkDS`, `emergencyalert=prj_LDqpPAqNGDaY4Aaix8ulwPc8oXmu`.
- API requests with explicit `teamId` have returned 403/404 in this connector; omitting it can work. This is an observed connector behavior, not a guarantee for other tokens.
- Deployment records (including CANCELED/ERROR) are **not** authoritative Vercel usage; verify the actual plan quota, counting semantics, and rolling windows from Vercel's usage/billing UI or authoritative API before gating.
- If team membership, pagination, API access, or quota semantics cannot be verified, mark monitoring `unknown` and do not automatically release deployments.

## Proposed escalation levels (not enabled)
- 70%: notify and batch nonurgent releases.
- 85%: pause routine releases after verified quota measurement.
- 95%: reserve emergency capacity; require manual approval.
- Resume only after confirmed capacity recovery, green CI, and an explicit check that the queued commit is still the latest approved SHA. Never replay every queued deployment.

## Release prerequisites
1. Read-only monitor tests green.
2. Live data verified for both projects, with pagination and cross-project totals.
3. Measured counts reconciled against Vercel's authoritative quota.
4. Stop/resume behavior tested in a non-production simulation, including concurrent requests, API errors, and emergency override.
5. Explicit approval before modifying production deployment settings or enabling automatic gates.

## Verification update (2026-11-09)
- The user confirmed that production deployment creation is no longer being rejected. Treat the prior permission incident as resolved; do not change team roles or deployment settings to address it.
- Vercel team membership API confirms the connected account is OWNER of KISHIBOJIM. This verifies role, not available deployment quota.
- Both projects are visible via the Vercel connector. The deployment history endpoint is available, but no authoritative remaining-quota value has yet been verified.
- Keep automated gating disabled. Do not infer remaining quota from the count of deployment records or from project `live` flags.

## Official limit validation and CI triage (2026-11-09)
- Vercel documentation (https://vercel.com/docs/limits, last updated Feb 3, 2026) confirms Hobby: **100 deployments created per 86,400 seconds** and **32 deployment builds per 3,600 seconds**. These are different counters; a deployment-history total cannot be interpreted as the build counter.
- `X-RateLimit-Remaining` in Vercel REST API responses measures **API request** rate limits, not the above deployment/build limits (https://vercel.com/docs/rest-api).
- Live remaining allocation and quota counter semantics are **not yet verified** for KISHIBOJIM; keep `quota_verified=false` and `safe_to_gate=false`. Do not activate automation based only on the official maximum limits.
- On commit `7d40a5997e100f3bb6495870993a811d80b7d484`, dedicated quota-monitor tests and PR classification succeeded, but general CI run 42568247397 failed: Vitest discovered `tests/rainLabGrade.test.ts` using `node:test` and reported `No test suite found`. The other 49 test files and 327 tests passed. This failure is outside the quota-monitor change; resolve it separately before PR promotion, not by weakening the CI requirement.

## Safety hardening (2026-11-10, PR #164 only)
- Verified via connected Vercel project reads: both project IDs have `accountId=team_VIfp8TXktY4DegRNpPhFb5uT`. This is not an authoritative quota count. Project `live` / latest canceled deployment cannot diagnose site availability.
- Monitor allowlist is fixed to exactly `prj_71NgSxGkNXkKECXc9jJRrJHdAkDS` and `prj_LDqpPAqNGDaY4Aaix8ulwPc8oXmu`. The optional `VERCEL_PROJECT_IDS` must equal these two exact IDs, not names; `VERCEL_TEAM_ID`, if present, must match the expected team. Each project is independently verified with `GET /v9/projects/{id}` and filtered via deployment API `projectId`; mismatches and unreadable results fail closed.
- Each project's history pages are paginated separately. Duplicate IDs are deduplicated; invalid IDs/timestamps, foreign project records, nonadvancing pages, ambiguous full-page timestamp ties, and the page limit abort rather than silently report an undercount. Failures emit `unknown`; they do **not** stop serving existing production sites and do not authorize a deployment.
- Dashboard/API `X-RateLimit-Remaining` concerns REST requests, **not** deployment creation or build quota. The official published Hobby maxima remain 100 created deployments / 86,400 seconds and 32 builds / 3,600 seconds. No verified API for the team's actual consumed/remaining counts has been identified; history remains observational. Thus 70% / 85% / 95% apply only to explicitly authoritative inputs in the *pure* `quota_alert` advisory function; all live output stays `unknown`, `quota_verified=false`, `safe_to_gate=false`.
- No automated stop, automatic resume, gate bypass, or replay is enabled. A future gate must use a trusted quota source, explicit team/project scopes, serialized reservations across both projects, idempotency, manual emergency allowance, and per-project newest approved SHA verification. Network/validation failures must hold new automated releases for manual review **without disabling a running service**. Resume requires fresh authoritative readings and green CI; do not release a queue of stale SHAs.
- Vercel API `teamId` scope can fail with connector-specific 403/404; never silently fall back to unverified cross-team totals. GitHub Actions tests use mocks and no Vercel token. Avoid triggering any Vercel build from this research branch.
- Evidence: https://github.com/miyazaki1016/emergencyalert/pull/164 , https://github.com/miyazaki1016/emergencyalert/issues/163 , https://vercel.com/docs/limits , https://vercel.com/docs/rest-api .
