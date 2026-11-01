import unittest
from scripts.development_ledger_proposal import update
from scripts.verify_ledger_proposal import verify

class ProposalSafetyTests(unittest.TestCase):
    def setUp(self):
        self.report = {"snapshot": {"prs": {"1": {"state": "merged", "title": "Fix\nunsafe|title", "head": "a" * 40, "updated_at": "2026-11-02T00:00:00Z"}}}}
        self.original = "# 台帳\n\n## 手動の判断\n保護する\n"

    def test_valid_proposal(self):
        proposed = update(self.original, self.report)
        self.assertTrue(verify(self.original, proposed, self.report))
        self.assertIn("Fix unsafe/title", proposed)

    def test_human_edit_rejected(self):
        proposed = update(self.original, self.report).replace("保護する", "削除する")
        with self.assertRaises(ValueError):
            verify(self.original, proposed, self.report)

    def test_empty_snapshot_rejected(self):
        with self.assertRaises(ValueError):
            verify(self.original, update(self.original, {"snapshot": {"prs": {}}}), {"snapshot": {"prs": {}}})

    def test_duplicate_marker_rejected(self):
        proposed = update(self.original, self.report)
        with self.assertRaises(ValueError):
            verify(self.original, proposed + "\n<!-- INVENTORY_FACTS_START -->", self.report)

if __name__ == "__main__":
    unittest.main()
