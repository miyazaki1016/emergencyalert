import unittest
from scripts.development_branch_compare import compare_rows, find_shared_paths, render_shared_paths

class BranchSharedPathTests(unittest.TestCase):
    def setUp(self):
        self.report = {
            "repository": "owner/repo", "default_branch": "main",
            "snapshot": {"branches": {
                "main": "a" * 40, "feat/a": "b" * 40, "feat/b": "c" * 40}}}
    def test_overlap_is_review_candidate_only(self):
        evidence = {}
        def api(path):
            self.assertIn("/compare/", path)
            return {"status": "ahead", "ahead_by": 2, "behind_by": 0,
                    "files": [{"filename": "src/feature.py"}, {"filename": "docs/info.md"}]}
        compare_rows(self.report, api, evidence)
        overlap = find_shared_paths(evidence)
        self.assertEqual(overlap, {"src/feature.py": ["feat/a", "feat/b"]})
        text = render_shared_paths(overlap, evidence)
        self.assertIn("NOT establish duplicate functionality", text)
        self.assertIn("src/feature.py", text)
        self.assertNotIn("docs/info.md", text)
    def test_partial_file_list_is_flagged(self):
        evidence = {"a": {"paths": ["src/x"], "files_complete": False},
                    "b": {"paths": ["src/x"], "files_complete": True}}
        output = render_shared_paths(find_shared_paths(evidence), evidence)
        self.assertIn("partial/unknown", output)
    def test_failed_compare_cannot_prove_no_overlap(self):
        evidence = {}
        def fail(_):
            raise OSError("unavailable")
        rows = compare_rows(self.report, fail, evidence)
        self.assertEqual(evidence, {})
        self.assertTrue(all("inconclusive" in row[1] for row in rows))
    def test_missing_main_fails_closed(self):
        self.report["snapshot"]["branches"].pop("main")
        with self.assertRaises(ValueError):
            compare_rows(self.report, lambda _: {}, {})

if __name__ == "__main__":
    unittest.main()
