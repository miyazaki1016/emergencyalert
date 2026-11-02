"""Fail-closed promotion policy tests."""
import unittest
from scripts.pr_promotion_policy import classify

class PromotionPolicyTests(unittest.TestCase):
    def test_draft_never_promotes(self):
        self.assertEqual(classify(["docs/readme.md"], draft=True)["decision"], "hold_draft")
    def test_missing_files_never_promotes(self):
        self.assertEqual(classify([], complete=False)["decision"], "hold_incomplete")
    def test_application_change_requires_owner(self):
        self.assertEqual(classify(["src/memory.py"])["decision"], "owner_approval_required")
    def test_environment_change_requires_owner(self):
        self.assertEqual(classify([".env.production"])["decision"], "owner_approval_required")
    def test_automation_change_requires_review(self):
        self.assertEqual(classify([".github/workflows/check.yml"])["decision"], "maintainer_review_required")
    def test_ledger_change_requires_diff_review(self):
        self.assertEqual(classify(["docs/DEVELOPMENT_LEDGER.md"])["decision"], "maintainer_review_required")
    def test_unknown_document_not_auto_approved(self):
        self.assertEqual(classify(["docs/notes.md"])["decision"], "maintainer_review_required")
    def test_path_traversal_fails_closed(self):
        self.assertEqual(classify(["../src/file.py"])["decision"], "hold_invalid")

if __name__ == "__main__":
    unittest.main()
