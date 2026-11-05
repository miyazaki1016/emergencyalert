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

    def test_missing_credentials(self):
        err = io.StringIO()
        with patch.object(monitor, "TOKEN", None), patch.object(monitor, "TEAM", None), contextlib.redirect_stderr(err):
            self.assertEqual(monitor.main(), 2)

if __name__ == "__main__":
    unittest.main()
