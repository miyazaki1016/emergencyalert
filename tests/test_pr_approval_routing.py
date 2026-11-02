import unittest
from scripts.pr_approval_routing import build, render

class RoutingTests(unittest.TestCase):
    def sample(self, state="open", sha="abc"):
        return {"repository": "owner/repo", "snapshot": {"prs": {
            "8": {"state": state, "title": "Risky | change", "head": sha, "updated_at": "2026-11-02T00:00:00Z"}
        }}}

    def test_owner_approval_is_explicit(self):
        rows = build(self.sample(), lambda repo, n: {
            "decision": "owner_approval_required", "reason": "Production", "head_sha": "abc"})
        self.assertEqual(rows[0]["route"], "ユーザー承認が必要（担当ソラが先に内容確認）")
        self.assertIn("owner_approval_required", render("owner/repo", rows))

    def test_stale_sha_is_held(self):
        rows = build(self.sample(), lambda repo, n: {
            "decision": "maintainer_review_required", "head_sha": "changed"})
        self.assertEqual(rows[0]["decision"], "hold_incomplete")

    def test_api_failure_is_held(self):
        def failure(repo, n):
            raise ValueError("unavailable")
        self.assertEqual(build(self.sample(), failure)[0]["decision"], "hold_incomplete")

    def test_closed_pr_not_routed(self):
        self.assertEqual(build(self.sample(state="merged"), lambda repo, n: None), [])

    def test_missing_snapshot_fails(self):
        with self.assertRaises(ValueError):
            build({"repository": "owner/repo"})

    def test_unknown_decision_is_held(self):
        rows = build(self.sample(), lambda repo, n: {"decision": "auto_merge", "head_sha": "abc"})
        self.assertEqual(rows[0]["decision"], "hold_invalid")

if __name__ == "__main__":
    unittest.main()
