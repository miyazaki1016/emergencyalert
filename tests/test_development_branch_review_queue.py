import unittest
from scripts.development_branch_review_queue import prioritize, render

class QueueTests(unittest.TestCase):
    def setUp(self):
        self.handoff = {"assignments": [
            {"branch": "a", "file_evidence_complete": True,
             "explicit_case_ids": ["M-01"], "pr_numbers": [12]},
            {"branch": "b", "file_evidence_complete": False,
             "explicit_case_ids": [], "pr_numbers": []}]}
        self.evidence = {"shared_paths": {"src/app.py": ["a", "b"]},
                         "equal_patches": {"src/app.py": [{
                             "patch_sha256": "f" * 64, "branches": ["a", "b"]}]}}
    def test_rank_exact_patch_and_incomplete(self):
        rows = prioritize(self.handoff, self.evidence)
        self.assertEqual([r["priority"] for r in rows], ["P1_review", "P1_review"])
        self.assertTrue(all(not r["auto_applied"] for r in rows))
        self.assertIn("NOT feature completeness", render(rows))
    def test_unlinked_but_complete_is_p2(self):
        self.handoff["assignments"] = [dict(self.handoff["assignments"][1], file_evidence_complete=True)]
        self.evidence = {"shared_paths": {}, "equal_patches": {}}
        self.assertEqual(prioritize(self.handoff, self.evidence)[0]["priority"], "P2_review")
    def test_no_changes_still_review_only(self):
        self.evidence = {"shared_paths": {}, "equal_patches": {}}
        row = prioritize(self.handoff, self.evidence)[0]
        self.assertEqual(row["priority"], "P3_review")
    def test_missing_evidence_rejected(self):
        with self.assertRaises(ValueError):
            prioritize(self.handoff, {})

if __name__ == "__main__":
    unittest.main()
