import unittest
import json
import os
import tempfile
import urllib.error
from pathlib import Path
from unittest.mock import patch
import scripts.development_inventory_delta as delta
from scripts.development_inventory_delta import compare

class DeltaTests(unittest.TestCase):
    def test_changes_and_unchanged(self):
        old = {"snapshot": {"branches": {"main": "a", "old": "x"}, "prs": {"1": {"state": "open"}}, "issues": {}}}
        new = {"snapshot": {"branches": {"main": "a", "new": "y"}, "prs": {"1": {"state": "merged"}}, "issues": {"2": {"state": "open"}}}}
        changes = compare(old, new)
        self.assertEqual(len(changes), 4)
        self.assertEqual({(x["type"], x["id"], x["change"]) for x in changes},
                         {("branches", "old", "absent_from_snapshot"),
                          ("branches", "new", "added"),
                          ("prs", "1", "changed"),
                          ("issues", "2", "added")})

    def test_http_401_preserves_report_and_marks_delta_unavailable(self):
        with tempfile.TemporaryDirectory() as tmp:
            cwd = os.getcwd()
            try:
                os.chdir(tmp)
                Path("inventory-output").mkdir()
                Path("inventory-output/report.json").write_text(
                    json.dumps({"snapshot": {"branches": {}, "prs": {}, "issues": {}}}))
                with patch.object(delta, "previous_snapshot",
                                  side_effect=urllib.error.HTTPError("test", 401, "Unauthorized", {}, None)):
                    delta.main()
                result = json.loads(Path("inventory-output/delta.json").read_text())
                self.assertEqual(result["status"], "comparison_unavailable")
                self.assertIn("401", result["note"])
                self.assertTrue(Path("inventory-output/report.json").exists())
            finally:
                os.chdir(cwd)

    def test_identical(self):
        snapshot = {"snapshot": {"branches": {"main": "x"}, "prs": {}, "issues": {}}}
        self.assertEqual(compare(snapshot, snapshot), [])

if __name__ == "__main__":
    unittest.main()
