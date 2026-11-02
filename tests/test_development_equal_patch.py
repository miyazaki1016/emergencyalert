import hashlib
import unittest
from scripts.development_branch_compare import compare_rows, find_equal_patches, render_equal_patches

class EqualPatchTests(unittest.TestCase):
    def test_identical_patch_matching_and_nonmatching(self):
        report = {"repository": "owner/repo", "default_branch": "main",
                  "snapshot": {"branches": {"main": "a" * 40, "a": "b" * 40, "b": "c" * 40, "c": "d" * 40}}}
        def fetch(path):
            branch = path.rsplit("...", 1)[1]
            patch = "@@ -1 +1 @@\n-old\n+same" if branch in ("a", "b") else "@@ -1 +1 @@\n-old\n+different"
            return {"status": "ahead", "ahead_by": 1, "behind_by": 0,
                    "files": [{"filename": "src/a.py", "patch": patch},
                              {"filename": "docs/a.md", "patch": patch},
                              {"filename": "src/unavailable.py"}]}
        evidence = {}
        compare_rows(report, fetch, evidence)
        matches = find_equal_patches(evidence)
        self.assertEqual(len(matches["src/a.py"]), 1)
        self.assertEqual(matches["src/a.py"][0]["branches"], ["a", "b"])
        self.assertNotIn("docs/a.md", matches)
        self.assertEqual(len(matches["src/a.py"][0]["patch_sha256"]), 64)
        self.assertIn("src/unavailable.py", evidence["a"]["patch_absence"])
        self.assertIn("NOT proof of duplicate features", render_equal_patches(matches))
    def test_absent_patches_do_not_infer_equality(self):
        evidence = {"one": {"patch_sha256": {}}, "two": {"patch_sha256": {}}}
        self.assertEqual(find_equal_patches(evidence), {})
    def test_invalid_digest_ignored(self):
        evidence = {"one": {"patch_sha256": {"src/a.py": "bad"}}, "two": {"patch_sha256": {"src/a.py": "bad"}}}
        self.assertEqual(find_equal_patches(evidence), {})

if __name__ == "__main__":
    unittest.main()
