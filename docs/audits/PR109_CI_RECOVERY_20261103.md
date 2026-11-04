# PR #109 CI recovery — 2026-11-03

## Evidence and cause
- Initial GitHub REST pull request response: head `4f08e9af5d22d60b16147bfe1c019cc799f53af9`, draft=true, mergeable=false, mergeable_state=dirty.
- Local merge reproduced conflicts in docs/PROJECT_OVERVIEW.md and docs/DEVELOPMENT_LEDGER.md. Both appended PR109 research notes where main added inventory records.
- Last branch CI run: 41476333067, head 99e1a0c1c762cd0f15567ea2779a297a44da04c0, pull_request, success. Branch runs total=102; subsequent commits had no new runs.
- ci.yml is unchanged, has pull_request plus push on main, four jobs, no draft condition, path filter or concurrency cancellation.
- GitHub documents that pull_request workflows do not run with merge conflicts: https://docs.github.com/en/actions/how-tos/troubleshoot-workflows
- Repository-wide CI continued succeeding (latest inspected run created 2026-11-02T21:03:26Z). This contradicts a repository-wide Actions outage or disablement. Administrative Actions/billing settings are not exposed by the connected API; no claim of direct inspection.
- Issue events list contains deployments, not synchronize webhook delivery records. Exact event delivery cannot be inferred from this endpoint.

## Repair
Merge current main into the PR branch, preserving both sides of the two documentation conflicts. No CI trigger changes, notification logic edits, production DB operations, deployments or PR merge. Existing main inventory work is imported, not reimplemented.

## Verification
The recovery commit must be checked via a new automatic pull_request CI run whose head_sha equals the repaired branch head. Old successful runs do not verify this commit. Final results and run URLs are reported in the task completion response.

## Additional failure uncovered by running current code
- Local npm test/build exposed literal `\\n` sequences and an over-escaped `/\\\\D/g` in lib/research/forecastHistoryReplay.ts (line 58). This was introduced after the last successful CI, so old green checks hid a real syntax error.
- Replace only those escapes with actual line breaks and the intended `/\\D/g` digit-stripping expression. Existing eight history-replay tests cover impossible calendar dates and missing pixel evidence. This research adapter is not connected to notification decisions.
- After repair: npm test = 41 files / 343 tests passed; npm run build = success (Next.js compile, type checking, static generation).
- Automatic pull_request runs appeared after conflict resolution while PR remained Draft: CI 41526228331 for 26b6900e62395ed045c2bb4037606c7b06f14bde; CI 41526291128 for syntax repair 96ae1b3540ba94dbf197d069ed54c58d2580f438. No manual rerun/dispatch was used.
- main branch protection read returned 403 Resource not accessible by integration. Thus this audit cannot enumerate administrative required-status settings; verify all four ci.yml jobs plus the PR classification job on the final head.
- No direct inspection of billing limits or GitHub incident history was needed to restore execution; successful automatic runs with unchanged settings are the operational evidence, not a claim that every account setting was readable.
