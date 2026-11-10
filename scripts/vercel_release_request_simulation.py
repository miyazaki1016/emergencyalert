"""Single-process ONLY simulation of atomic release-request intake.

No GitHub/Vercel network calls, secrets, deployment, or production gate.
The lock does NOT protect multiple GitHub Actions runners. An actual runner
would require durable storage with atomic CAS and server-side approvals.
"""
from copy import deepcopy
from threading import Lock

try:
    from scripts.vercel_release_request_policy import evaluate, Decision
except ModuleNotFoundError:
    from vercel_release_request_policy import evaluate, Decision


class SimulationLedger:
    """Model concurrent admissions and replacement of stale requests offline."""

    def __init__(self, latest_sha_by_project, ci_green_shas):
        self._lock = Lock()
        self._seen = set()
        self._pending = {}
        self._latest = dict(latest_sha_by_project)
        self._ci_green = set(ci_green_shas)
        self._normal_count = 0
        self._emergency_count = 0
        self._revision = 0

    def submit(self, request):
        with self._lock:
            snapshot = {
                "trusted": True,  # Simulation fixture, NOT real GitHub attestation
                "latest_sha_by_project": dict(self._latest),
                "ci_green_shas": set(self._ci_green),
                "seen_request_ids": set(self._seen),
                "normal_requests_today": self._normal_count,
                "emergency_requests_today": self._emergency_count,
            }
            decision = evaluate(request, snapshot)
            if decision.status != "REVIEW_READY":
                return decision
            project = request["project_id"]
            # Supersede any earlier request for the same project. The earlier
            # SHA is never replayed, but audit identity is remembered.
            previous = self._pending.get(project)
            if previous:
                self._seen.add(previous["request_id"])
            self._pending[project] = deepcopy(request)
            self._seen.add(request["request_id"])
            if request["emergency"]:
                self._emergency_count += 1
            else:
                self._normal_count += 1
            self._revision += 1
            return Decision("RECORDED_FOR_MANUAL_REVIEW", "no deployment authority")

    def update_latest(self, project_id, sha, ci_green=False):
        """Simulate a new commit; invalidate a superseded pending request."""
        with self._lock:
            if project_id not in self._latest or not isinstance(sha, str):
                raise ValueError("unknown project or invalid SHA")
            self._latest[project_id] = sha
            if ci_green:
                self._ci_green.add(sha)
            if project_id in self._pending and self._pending[project_id]["sha"] != sha:
                self._pending.pop(project_id)
            self._revision += 1

    def snapshot(self):
        with self._lock:
            return {
                "revision": self._revision,
                "pending": deepcopy(self._pending),
                "seen_request_ids": sorted(self._seen),
                "normal_requests_today": self._normal_count,
                "emergency_requests_today": self._emergency_count,
                "can_auto_deploy": False,
            }
