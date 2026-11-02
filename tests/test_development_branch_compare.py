import unittest
from scripts.development_branch_compare import compare_rows, render

class BranchCompareTests(unittest.TestCase):
    def setUp(self):
        self.report = {"repository": "owner/repo", "default_branch": "main",
                       "snapshot": {"branches": {"main": "a" * 40, "topic": "b" * 40}}}
    def test_compare_evidence(self):
        rows = compare_rows(self.report, lambda _: {
            "status": "ahead", "ahead_by": 2, "behind_by": 0,
            "files": [{"filename": "src/app.py"}]})
        self.assertEqual(rows[0][0], "topic")
        self.assertIn("src/app.py", render(rows))
    def test_failed_api_is_inconclusive(self):
        def fail(_):
            raise OSError("offline")
        rows = compare_rows(self.report, fail)
        self.assertIn("inconclusive", rows[0][1])
    def test_missing_main_fails(self):
        self.report["snapshot"]["branches"].pop("main")
        with self.assertRaises(ValueError):
            compare_rows(self.report, lambda _: {})

if __name__ == "__main__":
    unittest.main()
