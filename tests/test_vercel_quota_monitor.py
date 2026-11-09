"""Offline unit tests for the read-only monitor; no Vercel credentials required."""
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

class MonitorTests(unittest.TestCase):
    def run_monitor(self, pages, projects=None):
        out = io.StringIO()
        with patch.object(monitor, "TOKEN", "test"), patch.object(monitor, "TEAM", "team_test"), \
             patch.object(monitor, "PROJECTS", projects or set()), \
             patch.object(monitor, "fetch", side_effect=pages) as fetch, \
             contextlib.redirect_stdout(out):
            code = monitor.main()
        return code, json.loads(out.getvalue()), fetch

    def test_empty(self):
        code, result, fetch = self.run_monitor([{"deployments": []}])
        self.assertEqual(code, 0)
        self.assertEqual(result["deployment_records_24h"], 0)
        self.assertIs(result["safe_to_gate"], False)
        self.assertIs(result["quota_verified"], False)
        self.assertEqual(fetch.call_count, 1)

    def test_counts_and_project_filter(self):
        now = int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000)
        records = [
            {"uid": "a", "created": now - 1000, "name": "misaki"},
            {"uid": "b", "created": now - 2 * 3600 * 1000, "name": "emergencyalert"},
            {"uid": "c", "created": now - 25 * 3600 * 1000, "name": "misaki"},
            {"uid": "a", "created": now - 1000, "name": "misaki"},
        ]
        code, result, _ = self.run_monitor([{"deployments": records}], {"misaki"})
        self.assertEqual(code, 0)
        self.assertEqual(result["deployment_records_24h"], 1)
        self.assertEqual(result["deployment_records_1h"], 1)

    def test_warning_threshold(self):
        now = int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000)
        records = [{"uid": str(i), "created": now - 1000, "name": "misaki"} for i in range(70)]
        _, result, _ = self.run_monitor([{"deployments": records}])
        self.assertEqual(result["status"], "warning")
        self.assertEqual(result["status_basis"], "observed_deployment_records_not_quota")
        self.assertIs(result["safe_to_gate"], False)

    def test_default_scope_requires_verified_project_membership(self):
        from unittest.mock import MagicMock
        with patch.object(monitor, "TOKEN", "test"), patch.object(monitor, "TEAM", None), \
             patch.object(monitor, "PROJECTS", {"misaki", "emergencyalert"}), \
             patch.object(monitor.urllib.request, "urlopen") as urlopen:
            response = MagicMock()
            response.__enter__.return_value = io.BytesIO(json.dumps({"projects": [
                {"name": "misaki", "accountId": monitor.EXPECTED_TEAM}
            ]}).encode())
            urlopen.return_value = response
            with self.assertRaisesRegex(RuntimeError, "membership not verified"):
                monitor.main()

    def test_invalid_deployment_response_is_not_treated_as_zero(self):
        with self.assertRaisesRegex(RuntimeError, "invalid deployments response"):
            self.run_monitor([{"unexpected": []}])

    def test_missing_credentials(self):
        err = io.StringIO()
        with patch.object(monitor, "TOKEN", None), patch.object(monitor, "TEAM", None), contextlib.redirect_stderr(err):
            self.assertEqual(monitor.main(), 2)

if __name__ == "__main__":
    unittest.main()
