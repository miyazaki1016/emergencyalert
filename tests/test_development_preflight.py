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

    def test_composed_retry_query_returns_both_proof_and_cutoff_decisions(self):
        proof = {'kind':'proof','title':'http-503-retry-proof','condition':'','behavior':'再取得',
                 'verification':'未確認','remaining':'本番未確認','links':[]}
        cutoff = {'kind':'test','title':'drops an older retry when a newer candidate exists',
                  'condition':'','behavior':'','verification':'20260101003000 20260101003700',
                  'remaining':'本番未確認','links':[]}
        c = case(42, '条件の調整', decisions=[proof,cutoff])
        report = p.inspect(state(c), '全国予報を調査。503を取り直してる間に次の7分が来たら？古い枠の挙動を確認したい', now=NOW)
        self.assertEqual(report['status'], 'REVIEW_REQUIRED')
        self.assertEqual(report['candidates'][0]['implementation_decisions'], [proof,cutoff])

    def test_decision_only_match_requires_review_and_returns_exact_evidence(self):
        root = 'https://github.com/test/repo'
        row = {'kind':'test', 'title':'重複登録の再実行で二重反映を防ぐ', 'condition':'同じ登録IDで再実行',
               'behavior':'二重反映を拒否', 'verification':'テスト定義のみ。実行未確認',
               'remaining':'本番採用は未確認', 'links':[root+'/blob/'+'a'*40+'/lib/guard.ts#L24',
                                                       root+'/blob/'+'a'*40+'/tests/guard.test.ts#L31']}
        c = case(42, '保存処理の調整', decisions=[row])
        task = '重複登録の再実行で二重反映を防ぐ'
        report = p.inspect(state(c), task, now=NOW)
        self.assertEqual(report['status'], 'REVIEW_REQUIRED')
        candidate, = report['candidates']
        self.assertEqual(candidate['implementation_decisions'], [row])
        self.assertIn(row['links'][0], candidate['evidence'])
        self.assertIn('本番採用は未確認', p.markdown(report))
        decision = {'id':'pr-42', 'decision':'reuse', 'reason':'既存の登録IDによる二重反映防止を再利用し、未解決の条件だけ追加検証する',
                    'evidence':row['links'][1]}
        self.assertEqual(p.inspect(state(c), task, decisions=[decision], now=NOW)['status'], 'REVIEW_RECORDED')
        self.assertEqual(p.inspect(state(c), '猫の写真帳を作りたい', now=NOW)['status'], 'NO_STRONG_MATCH')

    def test_unrelated_decisions_do_not_accumulate_into_strong_match(self):
        rows = [{'kind':'test','title':word,'condition':'','behavior':'','verification':'','remaining':'','links':[]}
                for word in ('zirconium', 'tungsten', 'rhodium', 'osmium')]
        c = case(42, '独立した設定', decisions=rows)
        report = p.inspect(state(c), 'zirconium tungsten rhodium osmium', now=NOW)
        self.assertEqual(report['status'], 'NO_STRONG_MATCH')
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


def live_responses(*payloads):
    from unittest.mock import MagicMock
    responses = []
    for data in payloads:
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps(data).encode()
        responses.append(response)
    return responses


def pr_payload(body, **extra):
    payload = {'number': 300, 'title': 'task', 'state': 'open',
               'base': {'sha': 'a'*40, 'ref': 'main'}, 'head': {'sha': 'b'*40, 'ref': 'fix'},
               'body': body}
    payload.update(extra)
    return payload


class LiveEventTests(unittest.TestCase):
    def test_rerun_reads_latest_decision(self):
        from unittest.mock import patch, MagicMock
        import os
        old = {'pull_request': {'number': 300, 'body': 'old'}}
        latest = {'number': 300, 'title': 'task', 'base': {'sha': 'a'*40, 'ref': 'main'}, 'head': {'sha': 'b'*40, 'ref': 'fix'}, 'comments': 12, 'body': '<!-- history-preflight {"decisions":[{"id":"pr-62","decision":"reuse"}]} -->'}
        responses = []
        for data in (latest, {'object': {'sha': 'a'*40}}):
            response = MagicMock()
            response.__enter__.return_value.read.return_value = json.dumps(data).encode()
            responses.append(response)
        with patch.dict(os.environ, {'PREFLIGHT_GITHUB_TOKEN': 'test'}), patch('urllib.request.urlopen', side_effect=responses) as request:
            result = p.live_event(old, 'test/repo')
        self.assertEqual(p.event_task(result)[1][0]['decision'], 'reuse')
        self.assertNotIn('comments', result['pull_request'])
        self.assertTrue(request.call_args_list[0].args[0].full_url.endswith('/pulls/300'))

    def test_invalid_repository_rejected(self):
        with self.assertRaises(ValueError):
            p.live_event({'issue': {'number': 1}}, 'https://invalid.example')

    def test_pr300_rerun_replaces_stale_event_decisions_with_latest(self):
        # Regression for emergencyalert PR #300 (run 45366196961, re-run
        # attempt 3 on 2026-11-25 still REVIEW_REQUIRED): re-running an old
        # run reuses the old GITHUB_EVENT_PATH, whose frozen body holds only
        # the FIRST 8 decision records (pr-252 was still "distinct" there).
        # The latest PR body holds all 15 records (pr-252 corrected to
        # "extend", pr-286 "reuse", ...). Only the latest may be evaluated.
        from unittest.mock import patch
        import os
        def ack(decisions):
            return '<!-- history-preflight '+json.dumps({'decisions': decisions})+' -->'
        def record(i, decision):
            return {'id': 'pr-'+str(i), 'decision': decision,
                    'reason': '候補の原本を確認した判断記録の検証データ',
                    'evidence': 'https://github.com/test/repo/pull/'+str(i)}
        # Only the counts (8 stale / 15 latest) and pr-252 / pr-286 below are
        # from the real PR #300 record; the other ids are neutral fixtures.
        stale_ids = [252, 101, 102, 103, 104, 105, 106, 107]
        stale = {'pull_request': {'number': 300, 'title': 'old title',
                 'body': ack([record(i, 'distinct' if i == 252 else 'reuse') for i in stale_ids])}}
        latest_ids = stale_ids+[286, 108, 109, 110, 111, 112, 113]
        latest_decisions = [record(i, 'extend' if i == 252 else 'reuse') for i in latest_ids]
        latest = pr_payload(ack(latest_decisions))
        with patch.dict(os.environ, {'PREFLIGHT_GITHUB_TOKEN': 'test'}), \
                patch('urllib.request.urlopen', side_effect=live_responses(latest, {'object': {'sha': 'a'*40}})):
            result = p.live_event(stale, 'test/repo')
        task, decisions, _ = p.event_task(result)
        self.assertEqual(len(decisions), 15)
        self.assertEqual([d['id'] for d in decisions], ['pr-'+str(i) for i in latest_ids])
        by_id = {d['id']: d['decision'] for d in decisions}
        self.assertEqual(by_id['pr-252'], 'extend')
        self.assertEqual(by_id['pr-286'], 'reuse')
        self.assertNotIn('distinct', by_id.values())

    def test_live_event_ignores_unrelated_counters_and_timestamps(self):
        # Comment counts / reactions / updated_at change constantly and must
        # not invalidate an otherwise identical subject (no false "changed").
        from unittest.mock import patch
        import os
        first = pr_payload('body', comments=3, reactions={'total_count': 1}, updated_at='2026-11-25T00:00:00Z')
        second = pr_payload('body', comments=99, reactions={'total_count': 7}, updated_at='2026-11-25T01:00:00Z')
        with patch.dict(os.environ, {'PREFLIGHT_GITHUB_TOKEN': 'test'}):
            with patch('urllib.request.urlopen', side_effect=live_responses(first, {'object': {'sha': 'a'*40}})):
                one = p.live_event({'pull_request': {'number': 300}}, 'test/repo')
            with patch('urllib.request.urlopen', side_effect=live_responses(second, {'object': {'sha': 'a'*40}})):
                two = p.live_event({'pull_request': {'number': 300}}, 'test/repo')
        self.assertEqual(one, two)

    def test_live_event_detects_body_and_head_change_during_analysis(self):
        from unittest.mock import patch
        import os
        before = pr_payload('body v1')
        after_body = pr_payload('body v2')
        after_head = pr_payload('body v1', head={'sha': 'c'*40, 'ref': 'fix'})
        with patch.dict(os.environ, {'PREFLIGHT_GITHUB_TOKEN': 'test'}):
            for changed in (after_body, after_head):
                with patch('urllib.request.urlopen', side_effect=live_responses(before, {'object': {'sha': 'a'*40}})):
                    start = p.live_event({'pull_request': {'number': 300}}, 'test/repo')
                with patch('urllib.request.urlopen', side_effect=live_responses(changed, {'object': {'sha': 'a'*40}})):
                    end = p.live_event({'pull_request': {'number': 300}}, 'test/repo')
                self.assertNotEqual(start, end)

    def test_live_event_rejects_mismatched_or_invalid_originals(self):
        from unittest.mock import patch
        import os
        with patch.dict(os.environ, {'PREFLIGHT_GITHUB_TOKEN': 'test'}):
            # API returns a different number than the event identified.
            with patch('urllib.request.urlopen', side_effect=live_responses(pr_payload('x', number=301), {'object': {'sha': 'a'*40}})):
                with self.assertRaises(ValueError):
                    p.live_event({'pull_request': {'number': 300}}, 'test/repo')
            # An Issue lookup that resolves to a PR is not a valid Issue subject.
            issue_pr = {'number': 7, 'title': 't', 'body': 'b', 'pull_request': {'url': 'https://api.github.com/x'}}
            with patch('urllib.request.urlopen', side_effect=live_responses(issue_pr, {'object': {'sha': 'a'*40}})):
                with self.assertRaises(ValueError):
                    p.live_event({'issue': {'number': 7}}, 'test/repo')
            # A malformed main SHA must fail closed.
            with patch('urllib.request.urlopen', side_effect=live_responses(pr_payload('x'), {'object': {'sha': 'not-a-sha'}})):
                with self.assertRaises(ValueError):
                    p.live_event({'pull_request': {'number': 300}}, 'test/repo')

    def test_request_fingerprint_matches_javascript_publisher(self):
        # The publisher (development-preflight-publish.mjs) hashes
        # JSON.stringify([title, body]); lock the exact byte layout here.
        import hashlib
        self.assertEqual(p.request_fingerprint('a', 'b'),
                         hashlib.sha256('["a","b"]'.encode('utf-8')).hexdigest())
        self.assertEqual(p.request_fingerprint('題名', '本文\n次の行'),
                         hashlib.sha256('["題名","本文\\n次の行"]'.encode('utf-8')).hexdigest())
        self.assertEqual(p.request_fingerprint(None, None),
                         hashlib.sha256('["",""]'.encode('utf-8')).hexdigest())
        self.assertNotEqual(p.request_fingerprint('t', 'reuse'), p.request_fingerprint('t', 'extend'))

    def test_subject_event_for_manual_dispatch_validates_number(self):
        self.assertEqual(p.subject_event('issue', 304), {'issue': {'number': 304}})
        self.assertEqual(p.subject_event('pull_request', 300), {'pull_request': {'number': 300}})
        for kind, number in (('issue', 0), ('issue', -1), ('pull_request', '300'), ('comment', 1)):
            with self.assertRaises(ValueError):
                p.subject_event(kind, number)
        # A dispatched recheck still goes through live_event: only the number
        # is taken from the dispatch, everything else from the GitHub original.
        from unittest.mock import patch
        import os
        latest = {'number': 304, 'title': 'task', 'state': 'open', 'body': 'latest body'}
        with patch.dict(os.environ, {'PREFLIGHT_GITHUB_TOKEN': 'test'}), \
                patch('urllib.request.urlopen', side_effect=live_responses(latest, {'object': {'sha': 'a'*40}})) as request:
            result = p.live_event(p.subject_event('issue', 304), 'test/repo')
        self.assertEqual(result['issue']['body'], 'latest body')
        self.assertTrue(request.call_args_list[0].args[0].full_url.endswith('/issues/304'))


if __name__ == '__main__':
    unittest.main()
