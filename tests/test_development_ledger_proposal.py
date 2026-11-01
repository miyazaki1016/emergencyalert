import unittest
from scripts.development_ledger_proposal import START, END, update

class LedgerProposalTests(unittest.TestCase):
    def setUp(self):
        self.report = {"snapshot": {"prs": {"12": {
            "state": "open", "head": "abc123", "updated_at": "2026-11-01T12:00:00Z"
        }}}}

    def test_idempotent(self):
        once = update("# 台帳\n", self.report)
        self.assertEqual(update(once, self.report), once)
        self.assertIn("#12", once)

    def test_preserves_human_notes(self):
        ledger = "# 台帳\n\n## 担当者の判断\n完了ではない\n"
        proposed = update(ledger, self.report)
        self.assertIn("## 担当者の判断\n完了ではない", proposed)

    def test_invalid_markers_fail_closed(self):
        with self.assertRaises(ValueError):
            update(START + "\nno end", self.report)
        with self.assertRaises(ValueError):
            update(END + "\n" + START, self.report)

    def test_does_not_infer_completion(self):
        result = update("# 台帳\n", self.report)
        self.assertIn("開発完了・本番反映の認定ではありません", result)
        self.assertEqual(result.count(START), 1)
        self.assertEqual(result.count(END), 1)

if __name__ == "__main__":
    unittest.main()
