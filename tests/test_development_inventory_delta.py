import unittest
from scripts.development_inventory_delta import compare

class DeltaTests(unittest.TestCase):
    def test_changes_and_unchanged(self):
        old = {"snapshot": {"branches": {"main": "a", "old": "x"}, "prs": {"1": {"state": "open"}}, "issues": {}}}
        new = {"snapshot": {"branches": {"main": "a", "new": "y"}, "prs": {"1": {"state": "merged"}}, "issues": {"2": {"state": "open"}}}}
        changes = compare(old, new)
        self.assertEqual(len(changes), 4)
        self.assertEqual({(x["type"], x["id"], x["change"]) for x in changes},
                         {("branches", "old", "absent_from_snapshot"),
                          ("branches", "new", "added"),
                          ("prs", "1", "changed"),
                          ("issues", "2", "added")})

    def test_identical(self):
        snapshot = {"snapshot": {"branches": {"main": "x"}, "prs": {}, "issues": {}}}
        self.assertEqual(compare(snapshot, snapshot), [])

if __name__ == "__main__":
    unittest.main()
