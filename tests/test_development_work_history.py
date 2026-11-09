"""Offline work-history index tests; no network."""
import importlib.util
import pathlib
import unittest

SCRIPT=pathlib.Path(__file__).resolve().parents[1]/"scripts"/"development_work_history.py"
spec=importlib.util.spec_from_file_location("development_work_history",SCRIPT)
history=importlib.util.module_from_spec(spec)
spec.loader.exec_module(history)

class WorkHistoryTests(unittest.TestCase):
    def test_merged_closed_and_open_prs_all_appear(self):
        report={"repository":"example/demo","generated_at":"2026-11-09T00:00:00Z",
                "default_branch":"main",
                "snapshot":{"branches":{"main":"base","fix/a":"aaa","research/no-pr":"bbb"},
                            "prs":{"9":{"title":"Rain proof","body":"## Summary\nCompares every z4 pixel with stride 2.","state":"closed","head_ref":"fix/a"},
                                   "10":{"title":"LIVE JAPAN","body":"Interactive map prototype for the national homepage.","state":"merged","head_ref":"home/map"},
                                   "11":{"title":"MY rain","body":"","state":"open","head_ref":"rain/my"}}}}
        rendered=history.render(report)
        self.assertIn("Compares every z4 pixel",rendered)
        self.assertIn("LIVE JAPAN",rendered)
        self.assertIn("関連PR未確認",rendered)
        for n in (9,10,11):self.assertIn("/pull/"+str(n),rendered)
        self.assertIn("本番反映を意味しない",rendered)
    def test_missing_snapshot_fails(self):
        with self.assertRaises(ValueError):history.render({"repository":"example/demo","snapshot":{"branches":{}}})
    def test_markdown_is_escaped(self):
        self.assertEqual(history.cell("a|b <c>"),"a&#124;b &lt;c&gt;")

if __name__=="__main__":unittest.main()
