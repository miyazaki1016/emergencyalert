import pathlib
import unittest

class LedgerEventTriggerTests(unittest.TestCase):
    def test_trusted_event_configuration(self):
        workflow = pathlib.Path(".github/workflows/ledger-facts-proposal.yml").read_text()
        self.assertNotIn("pull_request_target:", workflow)
        self.assertNotIn("schedule:", workflow)
        self.assertIn("push:", workflow)
        self.assertIn("branches: [main]", workflow)
        self.assertIn("ref: main", workflow)
        self.assertNotIn("github.event.pull_request.head.sha", workflow)
        self.assertIn("cancel-in-progress: false", workflow)
        self.assertIn("automation/ledger-facts-", workflow)
        self.assertIn("gh pr create", workflow)
        self.assertNotIn("gh pr merge", workflow)

if __name__ == "__main__":
    unittest.main()
