"""Offline-only Vercel release request decision model.

IMPORTANT: This module has no network, GitHub writes, or deployment capability.
REVIEW_READY is a request for a human to review, NEVER permission to deploy.
Internal request budgets are voluntary workflow controls, NOT Vercel quota.
"""
from dataclasses import dataclass
import re

ALLOWED_PROJECTS = frozenset({
    "prj_71NgSxGkNXkKECXc9jJRrJHdAkDS",
    "prj_LDqpPAqNGDaY4Aaix8ulwPc8oXmu",
})
NORMAL_DAILY_REQUEST_BUDGET = 5
EMERGENCY_DAILY_REQUEST_BUDGET = 2
SHA = re.compile(r"^[0-9a-f]{40}$")


@dataclass(frozen=True)
class Decision:
    status: str
    reason: str
    can_auto_deploy: bool = False


def evaluate(request, snapshot):
    """Fail-closed, pure triage. Never authorizes Vercel deployment.

    request: project_id, sha, request_id, requester, approved_by, emergency
    snapshot: trusted, latest_sha_by_project, seen_request_ids, ci_green_shas,
              normal_requests_today, emergency_requests_today

    The caller MUST obtain the latest GitHub SHA, checks and approvals anew;
    the function cannot authenticate any caller-supplied facts.
    GitHub-side locking/persistence is required before enabling any gate.
    """
    def hold(reason):
        return Decision("HOLD", reason)

    if not isinstance(request, dict) or not isinstance(snapshot, dict):
        return hold("missing request or trusted snapshot")
    if snapshot.get("trusted") is not True:
        return hold("snapshot unavailable or untrusted")
    project = request.get("project_id")
    sha = request.get("sha")
    rid = request.get("request_id")
    requester = request.get("requester")
    approver = request.get("approved_by")
    emergency = request.get("emergency")
    if project not in ALLOWED_PROJECTS:
        return hold("project outside two-project allowlist")
    if not isinstance(sha, str) or not SHA.fullmatch(sha):
        return hold("invalid pinned commit SHA")
    if not isinstance(rid, str) or not rid.strip():
        return hold("missing idempotency key")
    if not isinstance(requester, str) or not requester:
        return hold("missing requester")
    if not isinstance(emergency, bool):
        return hold("invalid emergency flag")
    latest = snapshot.get("latest_sha_by_project")
    seen = snapshot.get("seen_request_ids")
    green = snapshot.get("ci_green_shas")
    if not isinstance(latest, dict) or not isinstance(seen, (list, tuple, set, frozenset)) or not isinstance(green, (list, tuple, set, frozenset)):
        return hold("incomplete authoritative GitHub snapshot")
    if not all(isinstance(x, str) for x in seen) or not all(isinstance(x, str) for x in green):
        return hold("malformed GitHub snapshot")
    # Enforce uniqueness BEFORE evaluating approvals and quotas.
    if rid in seen:
        return Decision("DUPLICATE", "request already recorded")
    if latest.get(project) != sha:
        return hold("stale commit; only latest approved SHA may be considered")
    if sha not in green:
        return hold("required GitHub checks are not green for pinned SHA")
    if not isinstance(approver, str) or not approver or requester == approver:
        return hold("independent human approval required")
    normal = snapshot.get("normal_requests_today")
    urgent = snapshot.get("emergency_requests_today")
    if any(isinstance(x, bool) or not isinstance(x, int) or x < 0 for x in (normal, urgent)):
        return hold("internal request ledger unavailable")
    if emergency:
        if urgent >= EMERGENCY_DAILY_REQUEST_BUDGET:
            return hold("voluntary emergency request reserve exhausted")
        if request.get("emergency_authorized") is not True:
            return hold("explicit emergency authorization required")
    elif normal >= NORMAL_DAILY_REQUEST_BUDGET:
        return hold("voluntary normal request budget exhausted; emergency reserve untouched")
    return Decision("REVIEW_READY", "manual review only; deployment disabled")


if __name__ == "__main__":
    raise SystemExit("Offline policy library: no executable deployment path")
