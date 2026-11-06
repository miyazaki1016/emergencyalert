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
