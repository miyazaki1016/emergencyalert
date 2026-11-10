"""Threaded offline-only tests; never contacts GitHub or Vercel."""
from concurrent.futures import ThreadPoolExecutor
import importlib.util
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from vercel_release_request_simulation import SimulationLedger
from vercel_release_request_policy import ALLOWED_PROJECTS, NORMAL_DAILY_REQUEST_BUDGET, EMERGENCY_DAILY_REQUEST_BUDGET

P1, P2 = sorted(ALLOWED_PROJECTS)
SHA1, SHA2, SHA3 = "a" * 40, "b" * 40, "c" * 40


def req(request_id, project=P1, sha=SHA1, emergency=False):
    result = dict(request_id=request_id, project_id=project, sha=sha,
                  requester="developer", approved_by="reviewer", emergency=emergency)
    if emergency:
        result["emergency_authorized"] = True
    return result


class ConcurrentRequestSimulationTests(unittest.TestCase):
    def setUp(self):
        self.ledger = SimulationLedger({P1: SHA1, P2: SHA2}, [SHA1, SHA2])

    def test_atomic_duplicate_request_under_threads(self):
        with ThreadPoolExecutor(max_workers=20) as pool:
            results = list(pool.map(self.ledger.submit, [req("issue-77")] * 50))
        self.assertEqual(sum(d.status == "RECORDED_FOR_MANUAL_REVIEW" for d in results), 1)
        self.assertEqual(sum(d.status == "DUPLICATE" for d in results), 49)
        s = self.ledger.snapshot()
        self.assertEqual(s["normal_requests_today"], 1)
        self.assertFalse(s["can_auto_deploy"])

    def test_cross_project_reserve_does_not_exceed_voluntary_budget(self):
        requests = [req("normal-%s" % i, P1 if i % 2 else P2, SHA1 if i % 2 else SHA2)
                    for i in range(40)]
        with ThreadPoolExecutor(max_workers=16) as pool:
            results = list(pool.map(self.ledger.submit, requests))
        self.assertEqual(sum(d.status == "RECORDED_FOR_MANUAL_REVIEW" for d in results),
                         NORMAL_DAILY_REQUEST_BUDGET)
        self.assertEqual(self.ledger.snapshot()["normal_requests_today"], NORMAL_DAILY_REQUEST_BUDGET)
        self.assertEqual(self.ledger.snapshot()["emergency_requests_today"], 0)

    def test_emergency_reserve_and_authorization(self):
        self.assertEqual(self.ledger.submit(req("unapproved", emergency=True) | {
            "emergency_authorized": False
        }).status, "HOLD")
        for i in range(EMERGENCY_DAILY_REQUEST_BUDGET):
            self.assertEqual(self.ledger.submit(req("urgent-%d" % i, emergency=True)).status,
                             "RECORDED_FOR_MANUAL_REVIEW")
        self.assertEqual(self.ledger.submit(req("urgent-over", emergency=True)).status, "HOLD")
        self.assertEqual(self.ledger.snapshot()["emergency_requests_today"],
                         EMERGENCY_DAILY_REQUEST_BUDGET)

    def test_new_commit_invalidates_pending_and_blocks_stale_sha(self):
        self.assertEqual(self.ledger.submit(req("old")).status, "RECORDED_FOR_MANUAL_REVIEW")
        self.ledger.update_latest(P1, SHA3, ci_green=True)
        self.assertNotIn(P1, self.ledger.snapshot()["pending"])
        self.assertEqual(self.ledger.submit(req("stale")).status, "HOLD")
        self.assertEqual(self.ledger.submit(req("new", sha=SHA3)).status,
                         "RECORDED_FOR_MANUAL_REVIEW")
        self.assertEqual(self.ledger.snapshot()["pending"][P1]["sha"], SHA3)

    def test_check_failure_and_bad_project_hold(self):
        self.assertEqual(self.ledger.submit(req("wrong", project="other")).status, "HOLD")
        self.ledger.update_latest(P1, SHA3, ci_green=False)
        self.assertEqual(self.ledger.submit(req("missing-ci", sha=SHA3)).status, "HOLD")

    def test_simulation_never_grants_deployment(self):
        self.ledger.submit(req("ok"))
        self.assertFalse(self.ledger.snapshot()["can_auto_deploy"])


if __name__ == "__main__":
    unittest.main()
