import unittest
from scripts.development_branch_case_handoff import build, render

class BranchCaseHandoffTests(unittest.TestCase):
    def setUp(self):
        self.report = {"default_branch": "main", "snapshot": {
            "branches": {"main": "a" * 40, "feature/alpha": "b" * 40},
            "prs": {"12": {"head_ref": "feature/alpha", "state": "closed"}}}}
        self.evidence = {"branches": {"feature/alpha": {"files_complete": True}},
                         "shared_paths": {"src/a.py": ["feature/alpha", "feature/beta"]}}
        self.index = "| ID | Work | Status | Evidence |\n|---|---|---|---|\n| M-01 | Alpha | review | `feature/alpha` |\n"
    def test_explicit_existing_case_and_pr(self):
        results = build(self.report, self.evidence, self.index)
        self.assertEqual(results[0]["explicit_case_ids"], ["M-01"])
        self.assertEqual(results[0]["pr_numbers"], [12])
        self.assertEqual(results[0]["shared_changed_paths"], ["src/a.py"])
        self.assertIn("M-01", render(results))
    def test_unmatched_does_not_create_case(self):
        results = build(self.report, self.evidence, self.index.replace("feature/alpha", "another"))
        self.assertEqual(results[0]["explicit_case_ids"], [])
        self.assertIn("要確認", render(results))
    def test_partial_evidence_is_explicit(self):
        self.evidence["branches"]["feature/alpha"]["files_complete"] = False
        self.assertIn("partial/unknown", render(build(self.report, self.evidence, self.index)))
    def test_missing_evidence_fails(self):
        with self.assertRaises(ValueError):
            build(self.report, {}, self.index)

if __name__ == "__main__":
    unittest.main()
