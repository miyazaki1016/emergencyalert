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
