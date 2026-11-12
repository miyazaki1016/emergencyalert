import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from development_resume import checkpoints, build, render


def row(**extra):
    return dict(issue=102, goal='エンジン総点検', status='paused', pause_reason='修正待ち',
                blocked_by=[181], next='元のコード比較に戻る', updated='2026-11-11',
                completion='全候補の所在と未確認条件を記録', **extra)


class ResumeTests(unittest.TestCase):
    def test_completed_child_only_proposes_resume(self):
        source = row()
        result = build([source], lambda n: dict(number=n, state='closed', state_reason='completed'))
        self.assertEqual(result[0]['candidate'], '再開待ち')
        self.assertEqual(result[0]['status'], 'paused')
        self.assertFalse(result[0]['auto_applied'])
        self.assertNotIn('children', source)

    def test_open_missing_failed_and_not_planned_never_resume(self):
        for issue in [dict(number=181, state='open'), {}, dict(number=181, state='closed', state_reason='not_planned'), dict(number=182, state='closed', state_reason='completed')]:
            self.assertNotEqual(build([row()], lambda n: issue)[0]['candidate'], '再開待ち')
        def fail(n):
            raise OSError('unavailable')
        self.assertEqual(build([row()], fail)[0]['candidate'], '要確認')

    def test_all_children_must_complete(self):
        r = row(); r['blocked_by'] = [181, 182]
        self.assertEqual(build([r], lambda n: dict(number=n, state='closed' if n == 181 else 'open', state_reason='completed'))[0]['candidate'], '子案件対応中')

    def test_invalid_and_unproven_completion_rejected(self):
        for changes in [dict(status='complete'), dict(blocked_by=[102]), dict(issue='102'), dict(pause_reason=''), dict(stages={'production': {'status':'passed'}})]:
            r = row(); r.update(changes)
            with self.assertRaises(ValueError):
                checkpoints('<!-- work-resume:v1\n'+json.dumps({'checkpoints':[r]})+'\n-->')

    def test_cycles_rejected(self):
        a = row(); b = row(); b['issue']=181; b['blocked_by']=[102]
        with self.assertRaises(ValueError):
            checkpoints('<!-- work-resume:v1\n'+json.dumps({'checkpoints':[a,b]})+'\n-->')

    def test_markdown_and_secret_redaction(self):
        r = row(); r['goal'] = 'x|y\n' + 'ghp_' + 'a'*36
        text = render(build([r], lambda n: {}), 'owner/repo', 'now')
        self.assertIn('&#124;', text)
        self.assertNotIn('ghp_'+'a'*36, text)
        self.assertIn('/issues/102', text)

    def test_real_ledger_parses(self):
        data = checkpoints((Path(__file__).resolve().parents[1]/'docs/DEVELOPMENT_LEDGER.md').read_text())
        self.assertEqual(data[0]['issue'], 205)

    def test_handoff_shows_recorded_resumption_and_next_action(self):
        source = row(resumed={'by': '担当ソラ', 'at': '2026-11-12T14:00:21+09:00',
                              'from': '匿名期限の確認', 'evidence': 'https://example.org/resume'})
        source.update(status='active', blocked_by=[], pause_reason='')
        rows = checkpoints('<!-- work-resume:v1\n' + json.dumps({'checkpoints': [source]}) + '\n-->')
        result = build(rows, lambda n: {})
        self.assertEqual(result[0]['candidate'], '再開記録あり')
        output = render(result, 'owner/repo', 'now')
        for value in ('担当ソラ', '匿名期限の確認', 'https://example.org/resume', source['next'], source['completion']):
            self.assertIn(value, output)
        source['status'] = 'paused'
        source['pause_reason'] = '再中断'
        with self.assertRaises(ValueError):
            checkpoints('<!-- work-resume:v1\n' + json.dumps({'checkpoints': [source]}) + '\n-->')

    def test_verification_head_change_and_missing_evidence(self):
        source = row(stages={'verification': {'status': 'passed', 'pr': 66,
                     'head_sha': 'a' * 40, 'evidence': ['https://example.org/old-ci']}})
        for prs, expected in [({}, 'unconfirmed'), ({'66': {'head': 'a' * 40}}, 'matched'),
                              ({'66': {'head': 'b' * 40}}, 'changed')]:
            with self.subTest(expected=expected):
                result = build([source], lambda n: {}, prs)
                self.assertEqual(result[0]['verification_head']['status'], expected)
                self.assertEqual(source['stages']['verification']['head_sha'], 'a' * 40)
        self.assertIn('最新HEADのCIを再確認', render(result, 'owner/repo', 'now'))


if __name__ == '__main__':
    unittest.main()
