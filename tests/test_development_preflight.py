"""Meaningful examples: rediscover old research before writing new code."""
import datetime as dt
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
import development_preflight as p

NOW = dt.datetime(2026, 11, 9, 9, tzinfo=dt.timezone.utc)


def case(number, title, conclusion='', paths=(), **extra):
    return dict(id='pr-'+str(number), number=number, title=title, body='', state='open',
                head=str(number).zfill(40), files=[{'path':s, 'url':'https://github.com/test/repo/blob/sha/'+s} for s in paths],
                curated={'summary':title, 'conclusion':conclusion}, **extra)


def state(*cases):
    return {'repository':'test/repo', 'generated_at':NOW.isoformat(),
            'coverage':{'prs':sum(c['id'].startswith('pr-') and not c.get('archived') for c in cases),
                        'branches':sum(c['id'].startswith('branch-') and not c.get('archived') for c in cases), 'errors':[]},
            'cases':{c['id']:c for c in cases}}


RAIN = case(62, 'ズーム4全画素走査と1ピクセル飛ばしを比較した実測',
            'stride2は88雨域中47雨域(53.4%)を完全見逃し。この条件で間引きの安全性は支持されない。PRは未統合の研究。',
            paths=['scripts/z4-stride-parity-proof.ts'])


class PreflightTests(unittest.TestCase):
    def test_freeform_japanese_recovers_unmerged_stride_conclusion(self):
        s=state(RAIN, case(1, '全国の雨量を地図へ表示する'))
        r=p.inspect(s, '全国の雨雲の候補抽出を軽くしたい。1ピクセルおきに間引いて走査しても大丈夫か比較する', now=NOW)
        self.assertEqual(r['status'], 'REVIEW_REQUIRED')
        self.assertEqual(r['candidates'][0]['id'], 'pr-62')
        self.assertIn('47雨域', p.markdown(r))
        self.assertIn('未統合', p.markdown(r))
        self.assertIn('https://github.com/test/repo/pull/62', p.markdown(r))

    def test_memory_email_request_recovers_prior_implementation(self):
        c=case(1, '匿名会話と記憶をメール確認前に同じユーザーへ保存する')
        r=p.inspect(state(c, RAIN), '匿名ユーザーの会話と記憶をメール確認前に引き継いで保存したい', now=NOW)
        self.assertEqual(r['candidates'][0]['id'], 'pr-1')
        self.assertEqual(r['status'], 'REVIEW_REQUIRED')

    def test_test_detection_synonyms_and_exact_paths(self):
        c=case(187, '雨判定ラボのテストをVitestで検出できるよう修正', paths=['tests/rainLabGrade.test.ts'])
        r=p.inspect(state(c, RAIN), '雨判定ラボのテストをCIで認識できない問題を直す', now=NOW)
        self.assertEqual(r['required_ids'][0], 'pr-187')
        r=p.inspect(state(c), '判定の境界条件を追加する', paths=['tests/rainLabGrade.test.ts'], now=NOW)
        self.assertEqual(r['required_ids'], ['pr-187'])

    def test_generic_topic_does_not_block_unrelated_work(self):
        r=p.inspect(state(RAIN), '猫の写真を投稿する新しい写真帳を作る', now=NOW)
        self.assertEqual(r['status'], 'NO_STRONG_MATCH')
        self.assertIn('安全証明ではない', r['notice'])

    def test_explicit_reference_and_evidence_backed_decision(self):
        s=state(RAIN)
        task='PR #62の結論を再利用して次の作業を決めたい'
        r=p.inspect(s, task, now=NOW)
        self.assertIn('pr-62', r['unresolved'])
        d={'id':'pr-62', 'decision':'reuse', 'reason':'47雨域の見逃し実測を採用し再測定せず全画素案の未解決条件だけを調べる', 'evidence':r['candidates'][0]['evidence'][0]}
        self.assertEqual(p.inspect(s, task, decisions=[d], now=NOW)['status'], 'REVIEW_RECORDED')
        d['evidence']='https://example.com/not-evidence'
        self.assertEqual(p.inspect(s, task, decisions=[d], now=NOW)['status'], 'REVIEW_REQUIRED')

    def test_stale_or_incomplete_history_never_passes(self):
        s=state(RAIN)
        s['generated_at']='2026-10-01T00:00:00Z'
        self.assertEqual(p.inspect(s, 'PR #62の結論を利用', now=NOW)['status'], 'INCOMPLETE')
        s=state(RAIN); s['coverage']['errors']=[{'id':'pr-1'}]
        self.assertEqual(p.inspect(s, 'PR #62の結論を利用', now=NOW)['status'], 'INCOMPLETE')
        s=state(RAIN); s['coverage']['prs']=2
        self.assertEqual(p.inspect(s, 'PR #62の結論を利用', now=NOW)['status'], 'INCOMPLETE')

    def test_deleted_branch_findings_preserved_and_same_head_deduplicated(self):
        branch=dict(RAIN, id='branch-old', title='古いズーム4全画素・間引き比較', number=None, archived=True)
        r=p.inspect(state(RAIN, branch), 'PR #62の結果を再利用する', now=NOW)
        self.assertEqual([c['id'] for c in r['candidates']], ['pr-62'])
        branch['head']='b'*40
        self.assertIn('branch-old', [c['id'] for c in p.inspect(state(RAIN, branch), '間引きと全画素を比較する', now=NOW)['candidates']])

    def test_event_ignores_own_pr_and_acknowledgment_keywords(self):
        ack={'decisions':[{'id':'pr-62', 'decision':'reuse'}]}
        event={'pull_request':{'number':9, 'title':'会話履歴を保持', 'body':'<!-- history-preflight\n'+json.dumps(ack)+'\n-->'}}
        task, decisions, exclude=p.event_task(event)
        self.assertNotIn('pr-62', task)
        self.assertEqual(exclude, 'pr-9')
        self.assertEqual(decisions, ack['decisions'])

    def test_cli_exit_code_requires_review_and_failure_has_no_secret(self):
        with tempfile.TemporaryDirectory() as tmp:
            snapshot=Path(tmp)/'state.json'; snapshot.write_text(json.dumps(state(RAIN)))
            proc=subprocess.run([sys.executable, str(Path(p.__file__)), '--history', str(snapshot), '--repo', 'test/repo', '--task', 'PR #62の比較実験を再測定したい', '--max-age-hours', '87600', '--output', tmp], capture_output=True, text=True)
            self.assertEqual(proc.returncode, 3, proc.stdout+proc.stderr)
            self.assertTrue((Path(tmp)/'preflight.md').exists())
            snapshot.write_text('ghp_'+'a'*36)
            proc=subprocess.run([sys.executable, str(Path(p.__file__)), '--history', str(snapshot), '--repo', 'test/repo', '--task', 'テスト用の作業を開始したい', '--output', tmp], capture_output=True, text=True)
            self.assertEqual(proc.returncode, 2)
            self.assertNotIn('ghp_', proc.stdout+proc.stderr+(Path(tmp)/'preflight.json').read_text())

    def test_task_and_decision_secrets_redacted(self):
        secret='ghp_'+'a'*36
        r=p.inspect(state(RAIN), 'PR #62を確認 '+secret, now=NOW)
        self.assertNotIn(secret, json.dumps(r))


if __name__ == '__main__':
    unittest.main()
