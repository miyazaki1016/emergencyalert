import unittest
from unittest.mock import patch
from types import SimpleNamespace
from scripts.vercel_build_guard import may_skip

SHA = "a" * 40

class BuildGuardTests(unittest.TestCase):
    def test_no_previous_commit_builds(self):
        self.assertFalse(may_skip(None))
    def test_invalid_sha_builds(self):
        self.assertFalse(may_skip("invalid"))
    @patch("scripts.vercel_build_guard.subprocess.run")
    def test_management_change_skips(self, run):
        run.return_value = SimpleNamespace(returncode=0, stdout="docs/DEVELOPMENT_LEDGER.md\n")
        self.assertTrue(may_skip(SHA))
    @patch("scripts.vercel_build_guard.subprocess.run")
    def test_app_change_builds(self, run):
        run.return_value = SimpleNamespace(returncode=0, stdout="app/page.tsx\n")
        self.assertFalse(may_skip(SHA))
    @patch("scripts.vercel_build_guard.subprocess.run")
    def test_mixed_change_builds(self, run):
        run.return_value = SimpleNamespace(returncode=0, stdout="docs/DEVELOPMENT_LEDGER.md\napp/page.tsx\n")
        self.assertFalse(may_skip(SHA))
    @patch("scripts.vercel_build_guard.subprocess.run")
    def test_failed_diff_builds(self, run):
        run.return_value = SimpleNamespace(returncode=128, stdout="")
        self.assertFalse(may_skip(SHA))

if __name__ == "__main__":
    unittest.main()
