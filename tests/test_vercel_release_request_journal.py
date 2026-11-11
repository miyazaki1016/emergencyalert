"""Offline-only SQLite journal tests: no GitHub or Vercel calls."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from vercel_release_request_journal import OfflineJournal
from vercel_release_request_policy import ALLOWED_PROJECTS, NORMAL_DAILY_REQUEST_BUDGET, EMERGENCY_DAILY_REQUEST_BUDGET

P1, P2 = sorted(ALLOWED_PROJECTS)
DAY = "2026-11-11"
S1, S2 = "a" * 40, "b" * 40


def request(rid, project=P1, sha=S1, emergency=False):
    item = dict(request_id=rid, project_id=project, sha=sha, emergency=emergency,
                requester="requester", approved_by="different-reviewer")
    if emergency:
        item["emergency_authorized"] = True
    return item


def snapshot():
    return dict(trusted=True, latest_sha_by_project={P1: S1, P2: S2},
                ci_green_shas={S1, S2})


class JournalTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "mock-journal.sqlite3"
        self.addCleanup(self.tmp.cleanup)
        self.journal = OfflineJournal(self.path)

    def test_two_independent_instances_cannot_double_admit(self):
        other = OfflineJournal(self.path)
        with ThreadPoolExecutor(max_workers=16) as pool:
            outcomes = list(pool.map(lambda i: (self.journal if i % 2 else other).submit(
                request("same-id"), snapshot(), DAY), range(30)))
        self.assertEqual(sum(d.status == "RECORDED_FOR_MANUAL_REVIEW" for d in outcomes), 1)
        self.assertEqual(sum(d.status == "DUPLICATE" for d in outcomes), 29)
        self.assertEqual(self.journal.counts(DAY), (1, 0))

    def test_shared_budget_across_projects_and_instances(self):
        other = OfflineJournal(self.path)
        def submit(i):
            project = P1 if i % 2 else P2
            sha = S1 if i % 2 else S2
            return (self.journal if i % 3 else other).submit(
                request("r-%d" % i, project, sha), snapshot(), DAY)
        with ThreadPoolExecutor(max_workers=12) as pool:
            outcomes = list(pool.map(submit, range(25)))
        self.assertEqual(sum(d.status == "RECORDED_FOR_MANUAL_REVIEW" for d in outcomes),
                         NORMAL_DAILY_REQUEST_BUDGET)
        self.assertEqual(self.journal.counts(DAY), (NORMAL_DAILY_REQUEST_BUDGET, 0))

    def test_emergency_reserve_is_separate(self):
        for i in range(NORMAL_DAILY_REQUEST_BUDGET):
            self.assertEqual(self.journal.submit(request("n-%d" % i), snapshot(), DAY).status,
                             "RECORDED_FOR_MANUAL_REVIEW")
        for i in range(EMERGENCY_DAILY_REQUEST_BUDGET):
            self.assertEqual(self.journal.submit(request("e-%d" % i, emergency=True),
                                                 snapshot(), DAY).status,
                             "RECORDED_FOR_MANUAL_REVIEW")
        self.assertEqual(self.journal.submit(request("overflow", emergency=True),
                                             snapshot(), DAY).status, "HOLD")
        self.assertEqual(self.journal.counts(DAY),
                         (NORMAL_DAILY_REQUEST_BUDGET, EMERGENCY_DAILY_REQUEST_BUDGET))

    def test_failed_checks_and_approval_do_not_reserve(self):
        bad = snapshot()
        bad["ci_green_shas"] = set()
        self.assertEqual(self.journal.submit(request("bad-ci"), bad, DAY).status, "HOLD")
        x = request("bad-approval")
        x["approved_by"] = x["requester"]
        self.assertEqual(self.journal.submit(x, snapshot(), DAY).status, "HOLD")
        self.assertEqual(self.journal.counts(DAY), (0, 0))

    def test_bad_day_never_writes(self):
        self.assertEqual(self.journal.submit(request("bad-day"), snapshot(), "yesterday").status,
                         "HOLD")
        self.assertEqual(self.journal.counts(DAY), (0, 0))

    def test_returns_no_deployment_authority(self):
        result = self.journal.submit(request("safe"), snapshot(), DAY)
        self.assertFalse(result.can_auto_deploy)


if __name__ == "__main__":
    unittest.main()
