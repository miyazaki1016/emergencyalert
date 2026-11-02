"""Regression tests for mixed GitHub snapshot types."""
import unittest
from unittest.mock import patch
from scripts import development_inventory_delta as delta

class DeltaStringDetailsTests(unittest.TestCase):
    def test_branch_sha_string_does_not_crash(self):
        change = {"type": "branches", "id": "fix/example", "change": "changed",
                  "before": "a" * 40, "after": "b" * 40}
        with patch.object(delta, "REPO", ""):
            result = delta.classify_candidates([change], "| M-01 | 会話 |")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["source_type"], "branches")
        self.assertEqual(result[0]["ledger_action"], "review_only")

    def test_pr_dict_still_classifies(self):
        change = {"type": "prs", "id": "123", "change": "changed",
                  "after": {"title": "conversation update", "head_ref": "feat/conversation"}}
        with patch.object(delta, "REPO", ""):
            result = delta.classify_candidates([change], "| M-01 | conversation |")
        self.assertEqual(result[0]["candidate_case_ids"], ["M-01"])

    def test_missing_details_does_not_crash(self):
        change = {"type": "issues", "id": "5", "change": "absent_from_snapshot",
                  "before": None, "after": None}
        with patch.object(delta, "REPO", ""):
            result = delta.classify_candidates([change], "")
        self.assertEqual(len(result), 1)

if __name__ == "__main__":
    unittest.main()
