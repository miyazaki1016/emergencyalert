import unittest
from scripts.development_index_proposal import update, START, END

class IndexProposalTests(unittest.TestCase):
    def setUp(self):
        self.original = "# 管理索引\n\n| ID | 作業 |\n|---|---|\n| M-01 | 案件 |\n"
        self.report = {"default_branch": "main", "snapshot": {
            "branches": {"main": "a" * 40}, "issues": {},
            "prs": {"1": {"state": "open", "title": "Test", "head_ref": "feat/test"}}}}
    def test_preserves_cases(self):
        result = update(self.original, self.report)
        self.assertIn("M-01", result)
        self.assertIn("feat/test", result)
        self.assertEqual(update(result, self.report), result)
    def test_no_snapshot_is_rejected(self):
        with self.assertRaises(ValueError):
            update(self.original, {})
    def test_corrupt_markers_rejected(self):
        with self.assertRaises(ValueError):
            update(self.original + START, self.report)
    def test_unmanaged_text_preserved(self):
        result = update(self.original + "\n手動記述\n", self.report)
        self.assertIn("手動記述", result)
        self.assertIn(END, result)
    def test_automation_pr_excluded(self):
        self.report["snapshot"]["prs"]["2"] = {
            "state": "open", "title": "automated", "head_ref": "automation/ledger-facts-99"}
        self.assertNotIn("automated", update(self.original, self.report))
if __name__ == "__main__":
    unittest.main()
