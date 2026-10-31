"""Offline tests for the read-only inventory; no GitHub token or network required."""
import importlib.util
import json
import os
import pathlib
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "development_inventory.py"
os.environ.update(GITHUB_REPOSITORY="example/demo")
os.environ.setdefault("GITHUB_TOKEN", "offline-test-token")
spec = importlib.util.spec_from_file_location("development_inventory", SCRIPT)
inventory = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inventory)

class InventoryTests(unittest.TestCase):
    def test_age_and_missing(self):
        self.assertIsNone(inventory.age(None))
        self.assertEqual(inventory.age(inventory.NOW.isoformat()), 0)

    def test_pagination(self):
        calls = []
        def fake_get(path):
            calls.append(path)
            return [{"name": str(i)} for i in range(100)] if path.rsplit("page=", 1)[-1] == "1" else [{"name": "last"}]
        with patch.object(inventory, "get", side_effect=fake_get):
            result = inventory.pages("/repos/example/demo/branches")
        self.assertEqual(len(result), 101)
        self.assertEqual(len(calls), 2)

    def test_pagination_multiple_full_pages(self):
        calls = []
        def fake_get(path):
            calls.append(path)
            page = int(path.rsplit("page=", 1)[-1])
            if page <= 2:
                return [{"name": "branch-%s-%s" % (page, i)} for i in range(100)]
            return [{"name": "branch-last"}]
        with patch.object(inventory, "get", side_effect=fake_get):
            result = inventory.pages("/repos/example/demo/pulls?state=all")
        self.assertEqual(len(result), 201)
        self.assertEqual(len(calls), 3)
        self.assertTrue(all("state=all" in path for path in calls))
        self.assertEqual(result[-1]["name"], "branch-last")

    def test_empty_page_terminates_pagination(self):
        with patch.object(inventory, "get", return_value=[]) as fake_get:
            result = inventory.pages("/repos/example/demo/issues?state=open")
        self.assertEqual(result, [])
        fake_get.assert_called_once_with("/repos/example/demo/issues?state=open&per_page=100&page=1")

    def test_pr_and_issue_pagination_are_independent(self):
        calls = []
        def fake_get(path):
            calls.append(path)
            page = int(path.rsplit("page=", 1)[-1])
            if "/pulls?" in path:
                return [{"number": i} for i in range(100)] if page == 1 else [{"number": 101}]
            if "/issues?" in path:
                return [{"number": i} for i in range(100)] if page == 1 else [{"number": 102}]
            raise AssertionError(path)
        with patch.object(inventory, "get", side_effect=fake_get):
            prs = inventory.pages("/repos/example/demo/pulls?state=all")
            issues = inventory.pages("/repos/example/demo/issues?state=open")
        self.assertEqual(len(prs), 101)
        self.assertEqual(len(issues), 101)
        self.assertEqual(len(calls), 4)

    def test_closed_pr_history_is_retained(self):
        old = "2020-01-01T00:00:00Z"
        closed = {"number": 8, "state": "closed", "title": "Done",
                  "updated_at": old, "html_url": "https://github.com/example/demo/pull/8",
                  "head": {"ref": "feature/done", "repo": {"full_name": "example/demo"}}}
        def fake_pages(path):
            if "/branches" in path:
                return [{"name": "main"}, {"name": "feature/done"}]
            if "/pulls?" in path:
                return [closed]
            if "/issues?" in path:
                return []
            raise AssertionError(path)
        with tempfile.TemporaryDirectory() as tmp:
            current = os.getcwd()
            try:
                os.chdir(tmp)
                with patch.object(inventory, "get", return_value={"default_branch": "main"}), patch.object(inventory, "pages", side_effect=fake_pages):
                    inventory.main()
                with open("inventory-output/report.json", encoding="utf-8") as f:
                    result = json.load(f)
            finally:
                os.chdir(current)
        self.assertEqual(result["open_pr_count"], 0)
        self.assertEqual(result["historical_pr_count"], 1)
        self.assertTrue(result["review_candidates"][0]["historical_pr_found"])

    def test_report_candidates_are_not_completion_claims(self):
        old = "2020-01-01T00:00:00Z"
        recent = inventory.NOW.isoformat()
        pr = {"number": 12, "state": "open", "title": "Open PR", "updated_at": old,
              "html_url": "https://github.com/example/demo/pull/12",
              "head": {"ref": "feature/open", "repo": {"full_name": "example/demo"}}}
        issue = {"number": 13, "title": "Open issue", "updated_at": recent,
                 "html_url": "https://github.com/example/demo/issues/13"}
        def fake_pages(path):
            if "/branches" in path:
                return [{"name": "main"}, {"name": "feature/open"}, {"name": "research/archive"}]
            if "/pulls?" in path:
                return [pr]
            if "/issues?" in path:
                return [issue, {"pull_request": {}, **issue}]
            raise AssertionError(path)
        with tempfile.TemporaryDirectory() as tmp:
            current = os.getcwd()
            try:
                os.chdir(tmp)
                with patch.object(inventory, "get", return_value={"default_branch": "main"}), patch.object(inventory, "pages", side_effect=fake_pages):
                    inventory.main()
                with open("inventory-output/report.json", encoding="utf-8") as f:
                    result = json.load(f)
            finally:
                os.chdir(current)
        self.assertEqual(result["branch_count"], 3)
        self.assertEqual(result["open_issue_count"], 1)
        self.assertEqual([x["name"] for x in result["review_candidates"]], ["research/archive"])
        self.assertEqual(len(result["stale_prs"]), 1)
        self.assertEqual(len(result["stale_issues"]), 0)
        self.assertIn("NOT proof", result["caveat"])

if __name__ == "__main__":
    unittest.main()
