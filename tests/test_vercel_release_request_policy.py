"""No credentials, API calls, GitHub writes or Vercel builds."""
import importlib.util
from pathlib import Path
import unittest

PATH = Path(__file__).resolve().parents[1] / "scripts" / "vercel_release_request_policy.py"
spec = importlib.util.spec_from_file_location("vercel_release_request_policy", PATH)
policy = importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name] = policy
spec.loader.exec_module(policy)

MISAKI, ALERT = sorted(policy.ALLOWED_PROJECTS)
SHA1 = "a" * 40
SHA2 = "b" * 40


class ReleaseRequestPolicyTests(unittest.TestCase):
    def setUp(self):
        self.request = dict(project_id=MISAKI, sha=SHA1, request_id="issue-7",
                            requester="author", approved_by="owner", emergency=False)
        self.snapshot = dict(trusted=True, latest_sha_by_project={MISAKI: SHA1, ALERT: SHA2},
                             seen_request_ids=[], ci_green_shas=[SHA1, SHA2],
                             normal_requests_today=0, emergency_requests_today=0)

    def evaluate(self, **changes):
        return policy.evaluate(dict(self.request, **changes), self.snapshot)

    def test_review_ready_is_never_permission_to_deploy(self):
        d = self.evaluate()
        self.assertEqual(d.status, "REVIEW_READY")
        self.assertFalse(d.can_auto_deploy)

    def test_rejects_untrusted_snapshot(self):
        self.snapshot["trusted"] = False
        self.assertEqual(self.evaluate().status, "HOLD")

    def test_scope_cannot_be_expanded(self):
        self.assertEqual(self.evaluate(project_id="other").status, "HOLD")

    def test_stale_sha_never_deployed(self):
        self.assertEqual(self.evaluate(sha=SHA2).status, "HOLD")

    def test_ci_failure_or_missing(self):
        self.snapshot["ci_green_shas"] = []
        self.assertEqual(self.evaluate().status, "HOLD")

    def test_duplicate_requests(self):
        self.snapshot["seen_request_ids"] = ["issue-7"]
        self.assertEqual(self.evaluate().status, "DUPLICATE")

    def test_author_is_not_approver(self):
        self.assertEqual(self.evaluate(approved_by="author").status, "HOLD")
        self.assertEqual(self.evaluate(approved_by=None).status, "HOLD")

    def test_normal_budget_does_not_use_emergency_reserve(self):
        self.snapshot["normal_requests_today"] = policy.NORMAL_DAILY_REQUEST_BUDGET
        self.assertEqual(self.evaluate().status, "HOLD")
        self.assertEqual(self.evaluate(emergency=True, emergency_authorized=True).status, "REVIEW_READY")

    def test_emergency_requires_separate_authorization(self):
        self.assertEqual(self.evaluate(emergency=True).status, "HOLD")
        self.assertEqual(self.evaluate(emergency=True, emergency_authorized=True).status, "REVIEW_READY")

    def test_emergency_reserve_exhaustion(self):
        self.snapshot["emergency_requests_today"] = policy.EMERGENCY_DAILY_REQUEST_BUDGET
        self.assertEqual(self.evaluate(emergency=True, emergency_authorized=True).status, "HOLD")

    def test_unknown_ledger_fails_closed(self):
        self.snapshot["normal_requests_today"] = None
        self.assertEqual(self.evaluate().status, "HOLD")

    def test_invalid_request_or_snapshot_fails_closed(self):
        self.assertEqual(policy.evaluate(None, self.snapshot).status, "HOLD")
        self.assertEqual(policy.evaluate(self.request, None).status, "HOLD")
        self.assertEqual(self.evaluate(sha="not-a-sha").status, "HOLD")
        self.assertEqual(self.evaluate(emergency=None).status, "HOLD")

    def test_each_project_tracked_independently(self):
        self.assertEqual(self.evaluate(project_id=ALERT, sha=SHA2).status, "REVIEW_READY")


if __name__ == "__main__":
    unittest.main()
