"""Read-only PR classification metadata and fail-closed tests."""
import unittest
from unittest.mock import patch
from scripts import pr_promotion_review as review

class PromotionReviewTests(unittest.TestCase):
    def test_complete_pr_is_review_only(self):
        def fake(path):
            if "/files?" in path:
                return [{"filename": "docs/notes.md"}]
            return {"base": {"ref": "main"}, "draft": False,
                    "changed_files": 1, "head": {"sha": "abc"}}
        with patch.object(review, "fetch_json", side_effect=fake):
            result = review.inspect("example/repo", 123)
        self.assertEqual(result["decision"], "maintainer_review_required")
        self.assertTrue(result["files_complete"])
        self.assertFalse(result["auto_merged"])
    def test_incomplete_pr_is_held(self):
        def fake(path):
            if "/files?" in path:
                return [{"filename": "docs/notes.md"}]
            return {"base": {"ref": "main"}, "draft": False, "changed_files": 2}
        with patch.object(review, "fetch_json", side_effect=fake):
            result = review.inspect("example/repo", 123)
        self.assertEqual(result["decision"], "hold_incomplete")
    def test_draft_is_held(self):
        def fake(path):
            if "/files?" in path:
                return [{"filename": "docs/notes.md"}]
            return {"base": {"ref": "main"}, "draft": True, "changed_files": 1}
        with patch.object(review, "fetch_json", side_effect=fake):
            result = review.inspect("example/repo", 123)
        self.assertEqual(result["decision"], "hold_draft")
    def test_non_main_is_held(self):
        with patch.object(review, "fetch_json", return_value={"base": {"ref": "dev"}}):
            result = review.inspect("example/repo", 123)
        self.assertEqual(result["decision"], "hold_invalid")

if __name__ == "__main__":
    unittest.main()
