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

## 2026-11-10: GitHub approval-based alternative (offline proposal; NOT enabled)

### Official source investigation
- https://vercel.com/docs/limits documents **100 deployments created in 86,400 seconds** and **32 builds in 3,600 seconds** on Hobby. These are rolling platform limits, not equivalent to deployments listed in a project history endpoint.
- https://vercel.com/docs/cli/usage describes `vercel usage [--format json] [--breakdown daily]`, which returns billing/resource usage per service at **day** granularity. It does not document exact rolling deployment/build counter balances.
- https://vercel.com/docs/pricing/manage-and-optimize-usage documents the dashboard **Usage** allotment indicators for billable resources, not a supported 3,600-second build remaining counter or a 86,400-second deployment remaining counter.
- Team billing endpoint `GET /v1/billing/charges` was called read-only for KISHIBOJIM, UTC 2026-11-09 to 2026-11-10. Result: **404 `costs_not_found`**, not a balance and not evidence that the team has unused quota. No other billing period is inferred.
- `X-RateLimit-Remaining` is Vercel API **request rate** headroom, not build/deployment headroom.
- No supported authoritative rolling remaining-count API or CLI command was verified. Therefore this feature must **not** compute Vercel remaining quota, estimate official available capacity from deployment history, automatically stop a production site, or automatically resume deployments. A dashboard might expose additional indicators: they must be checked against the relevant rolling quota with a documented definition before use.

### Alternative: voluntarily reduce deployment requests on GitHub
1. Keep development, CI, PR review and branch work unrestricted; request **production deployment** only using a separately reviewed, manually approved GitHub Issue/PR. The first implementation is the pure offline model `scripts/vercel_release_request_policy.py`; it contains **no Vercel API calls, credentials or deployment command**.
2. Each request pins exactly one approved project ID, a 40-character Git commit SHA, a unique idempotency key and a requester. Require independent human approver, all required GitHub checks passing **on the pinned SHA**, and fresh comparison against that project's latest approved SHA. A stale SHA is discarded rather than queued to replay.
3. `REVIEW_READY` means **human review is still required**. It never means that capacity exists or a deployment is authorized. All outcomes have `can_auto_deploy=false`. Duplicate request IDs produce `DUPLICATE`; unavailable/ambiguous GitHub state, CI failures, invalid team/project, missing reviewer or unknown internal ledger produce `HOLD`.
4. Maintain an **internal voluntary request budget**, separate from Vercel's real limit. The offline example uses at most **5 normal requests/day** and a separately tracked **2 emergency requests/day**, with explicit emergency authorization; these numbers are local operating defaults, **not guaranteed unused Vercel slots**. Emergency approvals must not bypass CI, freshness or authentication. If external projects/CLI can deploy, even this internal budget is only an advisory ceiling.
5. A future deployment runner (not present) would require GitHub Environments required reviewers, protected environment secrets, a single cross-project `concurrency` group, a durable idempotency ledger with atomic compare-and-set, explicit source identity checks, audit log, manual emergency path and renewed SHA/CI checks immediately before the call. A mere in-memory set is **not** concurrency-safe.
6. **Critical bypass limitation:** the existing `vercel.json` has `main: true` under `git.deploymentEnabled`. Git pushes/merges to `main` may therefore create a deployment independently of any proposed GitHub gate. A real enforceable gate needs a later separately approved migration to GitHub-controlled deployment initiation, with verified Git integration / Vercel routing and rollback. This PR does **not** change production Vercel settings or main branch behavior. See https://vercel.com/docs/project-configuration/git-configuration and https://vercel.com/docs/git .
7. On API/CI/ledger failure: hold **new requests for manual review**, keep the currently serving production deployment available, preserve development/CI, never disable existing sites or replay queued commits. Do not auto-restart based on a rolling-window guess.
8. On GitHub Actions execution: the existing branch workflow originally listened for `pull_request` default events and relevant changed paths. Connector-created commits at 2026-11-10 were not accompanied by a workflow/check run for their SHA. Do not treat this as successful CI; check actual run SHA. The dedicated offline workflow now includes `edited` in PR event types and includes the new test file paths to provide a possible CI retrigger via PR metadata editing; whether this works must be verified in Actions and otherwise reported as an execution blocker. GitHub `workflow_dispatch` remains available via GitHub UI, if authorized. It runs tests only and never calls Vercel.

### Acceptance requirements still open
- GitHub Actions success for the **latest branch SHA**, not merely successful preflight on main or an earlier commit.
- Concurrency/atomic idempotency tests and trustworthy review/commit identity verification with a real GitHub-backed transaction store.
- Proof that the future gate cannot be bypassed by Vercel's existing automatic `main` deployment hook, before any enablement.
- No main merge, Vercel build, production deployment, changes to production Vercel settings, or automatic pause/resume in this PR.
