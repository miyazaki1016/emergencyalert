import unittest
from scripts.development_index_review import render

class IndexReviewTests(unittest.TestCase):
    def setUp(self):
        self.index = "| ID | 作業 | 現在の管理状態 |\n|---|---|---|\n| M-01 | Sample | 保留 |\n"
        self.report = {"snapshot": {"branches": {"main": "a" * 40, "work": "b" * 40},
                                    "prs": {"12": {"state": "merged"}}, "issues": {}},
                       "review_candidates": [{"name": "work", "historical_pr_found": True}]}
    def test_renders_branch_review(self):
        output = render(self.index, self.report)
        self.assertIn("work", output)
        self.assertIn("M", output)
    def test_missing_snapshot_fails(self):
        with self.assertRaises(ValueError):
            render(self.index, {})
    def test_unknown_candidate_fails(self):
        self.report["review_candidates"][0]["name"] = "unknown"
        with self.assertRaises(ValueError):
            render(self.index, self.report)
    def test_no_cases_fails(self):
        with self.assertRaises(ValueError):
            render("# empty", self.report)

if __name__ == "__main__":
    unittest.main()
