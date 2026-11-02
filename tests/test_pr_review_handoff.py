"""Review handoff queue regression tests."""
import unittest
from scripts.pr_review_handoff import render

class ReviewHandoffTests(unittest.TestCase):
    def test_only_open_prs(self):
        report = {"repository": "a/b", "snapshot": {"prs": {
            "1": {"state": "open", "title": "Fix test", "updated_at": "2026-11-02T01:00:00Z"},
            "2": {"state": "merged", "title": "Merged PR"}}}}
        result = render(report)
        self.assertIn("https://github.com/a/b/pull/1", result)
        self.assertNotIn("/pull/2", result)
        self.assertIn("確認待ち", result)
    def test_empty_queue(self):
        self.assertIn("open PRなし", render({"repository": "a/b", "snapshot": {"prs": {}}}))
    def test_missing_snapshot_fails(self):
        with self.assertRaises(ValueError):
            render({"repository": "a/b"})
    def test_title_cannot_break_table(self):
        result = render({"repository": "a/b", "snapshot": {"prs": {
            "3": {"state": "open", "title": "A | B\nC"}}}})
        self.assertIn("A / B C", result)

if __name__ == "__main__":
    unittest.main()
