"""Evidence provenance, incomplete data, revision retention and preflight search."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('history',Path(__file__).resolve().parents[1]/'scripts/development_history_evidence.py')
history=importlib.util.module_from_spec(spec);spec.loader.exec_module(history)

class FakeAPI:
    repo='test/repo'
    pending=set()
    calls=0
    def pages(self,path,field=None): return []
    def get(self,path):
        return {'title':'Stride experiment','body':'47 regions missed','head':{'sha':'a'*40,'ref':'research'},'base':{'sha':'b'*40,'ref':'feature'},'state':'closed','merged_at':'2026-01-01','merge_commit_sha':'c'*40,'updated_at':'2026-01-02','draft':False}

class HistoryTests(unittest.TestCase):
    def test_decision_candidates_link_test_code_and_proof_without_pr_summary(self):
        head = 'a' * 40
        root = 'https://github.com/test/repo'
        def file(path, text):
            return {'path': path, 'url': f'{root}/blob/{head}/{path}', 'source': {'text': text}}
        files = [
            file('lib/cycle.ts', 'export function retain(input) {\n  return input.newTime <= input.oldTime;\n}\n'),
            file('lib/cycle.test.ts', 'test("drops an older retry when a newer candidate exists", () => {\n'
                 ' expect(retain({oldTime:"20260101003000",newTime:"20260101003700"})).toBe(false);\n});'),
            file('scripts/http-503-retry-proof.ts', 'const schedule = process.env.RETRY_SCHEDULE_MS ?? "30000,60000";'),
            file('.github/workflows/proof.yml', 'run: npx tsx scripts/http-503-retry-proof.ts'),
        ]
        case = {'id':'pr-42','title':'isolated sample','head':head,'files':files,
                'curated': {'proof_observations': {'scripts/http-503-retry-proof.ts': {'run_id':7,'result':'1件復帰'}}},
                'runs':[{'id':7,'head_sha':'b'*40,'conclusion':'success','url':f'{root}/actions/runs/7'}]}
        case['decisions'] = history.decision_candidates(case,'test/repo')
        proof, decision = case['decisions']
        self.assertIn('0.5分・1分', proof['behavior'])
        self.assertIn('未確認', proof['verification'])
        self.assertIn('proof.yml', proof['links'][1])
        self.assertIn('toBe(false)', decision['verification'])
        self.assertIn('return input.newTime', decision['behavior'])
        self.assertTrue(decision['links'][1].endswith('lib/cycle.test.ts#L1'))
        for query in ['503 リトライ','503を取り直してる間に次の7分が来たら？']:
            self.assertEqual(history.search({'pr-42':case},query), [case])
        case['runs'][0]['head_sha'] = head
        proof = history.decision_candidates(case,'test/repo')[0]
        self.assertIn('1件復帰', proof['verification'])
        self.assertIn(f'{root}/actions/runs/7', proof['links'])
        with tempfile.TemporaryDirectory() as temp:
            history.render_output({'generated_at':'now','cases':{'pr-42':case},'coverage':{'errors':[]}},temp,'test/repo')
            index = json.loads(Path(temp,'search-index.json').read_text())['cases'][0]
            self.assertIn('503を取り直してる間に次の7分が来たら？',index['search_text'])

    def test_phone_search_retains_code_conditions_and_main_status(self):
        with tempfile.TemporaryDirectory() as temp:
            case={'id':'pr-62','title':'研究','state':'merged','main_status':'main祖先として未確認',
                  'remaining':'受入試験が未完了','files':[],
                  'code_facts':[{'file':'test.ts','kind':'条件','expression':'expect(missed).toBe(47)','url':'https://github.com/test/repo/blob/sha/test.ts'}]}
            history.render_output({'generated_at':'now','cases':{'pr-62':case},'coverage':{'errors':[]}},temp,'test/repo')
            index=json.loads(Path(temp,'search-index.json').read_text())['cases'][0]
            self.assertIn('toBe(47)',index['search_text'])
            self.assertEqual(index['remaining'],'受入試験が未完了')
            row=next(line for line in Path(temp,'README.md').read_text().splitlines() if 'cases/pr-62.md' in line)
            self.assertIn('main祖先として未確認',row)

    def test_checkout_race_fetches_exact_missing_pr_head(self):
        import subprocess
        sha='a'*40
        with patch.object(history,'git',side_effect=[subprocess.CalledProcessError(1,'git'),'', '']) as run:
            history.ensure_commit(sha)
            self.assertEqual(run.call_args_list[1].args,('fetch','--quiet','--no-tags','origin',sha))
        with self.assertRaises(ValueError):history.ensure_commit('main; echo secret')

    def test_merged_into_feature_is_not_main_or_production(self):
        api=FakeAPI();api.main_sha='d'*40
        import subprocess
        with patch.object(history,'ensure_commit'),patch.object(history,'local_files',return_value=[]),patch.object(history,'local_commits',return_value=[]),patch.object(history.subprocess,'check_call',side_effect=subprocess.CalledProcessError(1,'git')):
            case=history.collect_pr(api,'62',{}, {},{})
        self.assertEqual(case['state'],'merged')
        self.assertIn('main祖先として未確認',case['main_status'])
        self.assertIn('未確認',case['production'])
        self.assertNotIn('検証済み',case['verification'])

    def test_search_uses_all_terms_including_numeric_conclusion(self):
        cases={'pr-62':{'id':'pr-62','title':'ズーム4 間引き','curated':{'conclusion':'stride2 47雨域を完全見逃し'}},'pr-1':{'id':'pr-1','title':'stride2の別件'}}
        self.assertEqual([c['id'] for c in history.search(cases,'stride2 47')],['pr-62'])
        self.assertEqual(history.search(cases,''),[])

    def test_redact_secrets_and_skip_sensitive_source(self):
        secret='ghp_'+'a'*36
        self.assertNotIn(secret,history.clean('Authorization: Bearer '+secret))
        self.assertNotIn('password-value',history.clean('password="password-value"'))
        with patch.object(history,'git') as mocked:
            self.assertNotIn('text',history.source('a'*40,'.env.production'))
            mocked.assert_not_called()

    def test_revisions_survive_changed_and_deleted_branch(self):
        with tempfile.TemporaryDirectory() as temp:
            old={'id':'branch-old','title':'昔の検証','files':[],'state':'研究','curated':{'conclusion':'47雨域'}}
            prior={'cases':{'branch-old':old}}; report={'repository':'test/repo','generated_at':'2026-11-09T01:00:00Z','default_branch':'main','snapshot':{'prs':{},'branches':{'main':'b'*40}}}
            history.dump(Path(temp,'revisions','branch-old','old.json'),old)
            state=history.build(report,FakeAPI(),temp,prior)
            self.assertTrue(state['cases']['branch-old']['archived'])
            self.assertTrue(Path(temp,'revisions','branch-old','old.json').exists())
            self.assertIn('47雨域',Path(temp,'cases','branch-old.md').read_text())

    def test_missing_api_cache_never_fabricates_evidence(self):
        with tempfile.TemporaryDirectory() as temp:
            api=history.API('test/repo',temp,True)
            with self.assertRaises(history.Missing):api.get('/pulls/9')
            self.assertEqual(len(api.pending),1)

    def test_viewer_escapes_untrusted_pr_html(self):
        with tempfile.TemporaryDirectory() as temp:
            c={'id':'pr-1','title':'<img src=x onerror=alert(1)>','body':'</script><script>alert(1)</script>','state':'open','files':[],'curated':{'summary':'悪意あるHTMLを表示テキストとして扱う'}}
            history.render_output({'generated_at':'now','cases':{'pr-1':c},'coverage':{'errors':[]}},temp,'test/repo')
            viewer=Path(temp,'search.html').read_text()
            self.assertNotIn('<img src=x',viewer)
            self.assertNotIn('</script><script>alert(1)',viewer)

    def test_exact_code_fact_retains_source_link_and_assertion(self):
        facts=history.code_facts([{'path':'tests/parity.ts','patch':'+expect(missed).toBe(47);','url':'https://github.com/test/repo/blob/sha/tests/parity.ts'}])
        self.assertEqual(facts[0]['kind'],'テストの期待値・条件')
        self.assertIn('47',facts[0]['expression'])
        self.assertIn('tests/parity.ts',facts[0]['url'])

    def test_unchanged_pr_reuses_evidence_without_requests(self):
        meta={'head':'a'*40,'state':'open','updated_at':'now'}
        fingerprint=history.digest([history.VERSION,meta,None,history.digest([])])
        old={'id':'pr-1','title':'既存成果','head':'a'*40,'files':[],'fingerprint':fingerprint,'state':'open'}
        report={'repository':'test/repo','generated_at':'2026-11-09T01:00:00Z','default_branch':'main','snapshot':{'prs':{'1':meta},'branches':{'main':'b'*40}}}
        with tempfile.TemporaryDirectory() as temp,patch.object(history,'collect_pr',side_effect=AssertionError('Unchanged PR reread')),patch.object(history.subprocess,'run') as run:
            run.return_value.returncode=1
            state=history.build(report,FakeAPI(),temp,{'cases':{'pr-1':old}})
            self.assertEqual(state['cases']['pr-1']['title'],'既存成果')

if __name__=='__main__':unittest.main()
