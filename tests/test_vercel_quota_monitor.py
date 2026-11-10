"""Offline tests: mock all API calls; no token, build or deployment required."""
import contextlib
import datetime as dt
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / "scripts" / "vercel_quota_monitor.py"
spec = importlib.util.spec_from_file_location("vercel_quota_monitor", MODULE)
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)
MISAKI, ALERT = list(monitor.EXPECTED_PROJECTS)
NOW = int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000)


def item(uid, project=MISAKI, age=1000):
    return {"uid": uid, "projectId": project, "created": NOW - age}


class MonitorTests(unittest.TestCase):
    def run_monitor(self, pages):
        out = io.StringIO()
        def verify(path, params=None):
            pid = path.rsplit("/", 1)[-1]
            return {"id": pid, "name": monitor.EXPECTED_PROJECTS[pid],
                    "accountId": monitor.EXPECTED_TEAM}
        with patch.object(monitor, "TOKEN", "test"), patch.object(monitor, "TEAM", None), \
             patch.object(monitor, "PROJECTS", set()), \
             patch.object(monitor, "request_json", side_effect=verify), \
             patch.object(monitor, "fetch", side_effect=pages) as fetch, \
             contextlib.redirect_stdout(out):
            code = monitor.main()
        return code, json.loads(out.getvalue()), fetch

    def test_empty_both_projects(self):
        code, result, fetch = self.run_monitor([{"deployments": []}, {"deployments": []}])
        self.assertEqual(code, 0)
        self.assertEqual(fetch.call_count, 2)
        self.assertEqual(result["deployment_records_24h"], 0)
        self.assertEqual(result["status"], "unknown")
        self.assertFalse(result["safe_to_gate"])
        self.assertFalse(result["quota_verified"])
        self.assertEqual(set(result["projects_filter"]), set(monitor.EXPECTED_PROJECTS))

    def test_dedup_and_per_project_scope(self):
        code, result, calls = self.run_monitor([
            {"deployments": [item("a"), item("a"), item("old", age=25*3600*1000)]},
            {"deployments": [item("b", ALERT, age=2*3600*1000)]}])
        self.assertEqual(code, 0)
        self.assertEqual((result["deployment_records_24h"], result["deployment_records_1h"]), (2, 1))
        self.assertEqual([c.args[0]["projectId"] for c in calls.call_args_list], [MISAKI, ALERT])

    def test_malformed_response_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "invalid deployments"):
            self.run_monitor([{"unexpected": []}])

    def test_foreign_project_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "foreign"):
            self.run_monitor([{"deployments": [item("x", ALERT)]}])

    def test_missing_id_or_timestamp_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "identifier"):
            self.run_monitor([{"deployments": [{"projectId": MISAKI, "created": NOW}]}])
        with self.assertRaisesRegex(RuntimeError, "timestamp"):
            self.run_monitor([{"deployments": [{"projectId": MISAKI, "uid": "x"}]}])

    def test_exact_team_and_id_allowlist(self):
        with patch.object(monitor, "TOKEN", "test"), patch.object(monitor, "TEAM", "other"):
            with self.assertRaisesRegex(RuntimeError, "unexpected team"):
                monitor.main()
        with patch.object(monitor, "TOKEN", "test"), patch.object(monitor, "TEAM", None), \
             patch.object(monitor, "PROJECTS", {"misaki"}):
            with self.assertRaisesRegex(RuntimeError, "exactly"):
                monitor.main()

    def test_membership_fail_closed(self):
        with patch.object(monitor, "TOKEN", "test"), patch.object(monitor, "TEAM", None), \
             patch.object(monitor, "PROJECTS", set()), \
             patch.object(monitor, "request_json", return_value={
                 "id": MISAKI, "name": "misaki", "accountId": "wrong"}):
            with self.assertRaisesRegex(RuntimeError, "membership"):
                monitor.main()

    def test_pagination_full_page_and_next_page(self):
        records = [item("id"+str(i), age=1000+i*1000) for i in range(100)]
        code, result, calls = self.run_monitor([
            {"deployments": records}, {"deployments": [item("next", age=110000)]},
            {"deployments": []}])
        self.assertEqual(code, 0)
        self.assertEqual(result["deployment_records_24h"], 101)
        self.assertEqual(calls.call_args_list[1].args[0]["until"], min(x["created"] for x in records)-1)

    def test_ambiguous_page_boundary_fail_closed(self):
        records = [item("id"+str(i)) for i in range(100)]
        with self.assertRaisesRegex(RuntimeError, "ambiguous page boundary"):
            self.run_monitor([{"deployments": records}])

    def test_api_error_not_zero(self):
        with self.assertRaises(OSError):
            self.run_monitor([OSError("network unavailable")])

    def test_quota_thresholds_only_authoritative(self):
        self.assertEqual(monitor.quota_alert(99, 100), "unknown")
        self.assertEqual(monitor.quota_alert(69, 100, True), "normal")
        self.assertEqual(monitor.quota_alert(70, 100, True), "warning")
        self.assertEqual(monitor.quota_alert(85, 100, True), "high")
        self.assertEqual(monitor.quota_alert(95, 100, True), "critical")
        self.assertEqual(monitor.quota_alert(None, 100, True), "unknown")
        self.assertEqual(monitor.quota_alert(3, 0, True), "unknown")

    def test_missing_credentials(self):
        with patch.object(monitor, "TOKEN", None):
            self.assertEqual(monitor.main(), 2)


if __name__ == "__main__":
    unittest.main()
