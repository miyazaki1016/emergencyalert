#!/usr/bin/env python3
"""Evidence-backed Japanese history. Standard library; never executes project code.

Extends development_work_history.py and its inventory snapshot. No LLM/API billing,
DB, application routes, notification calls or deployment mutations.
"""
import argparse
import datetime as dt
import hashlib
import html
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request

VERSION = 3
SAFE_SUFFIXES = {'.py','.ts','.tsx','.js','.mjs','.cjs','.json','.md','.yml','.yaml','.sql','.css','.sh'}
SECRET_PATH = re.compile(r'(^|[/._-])(env|secret|credential|private[-_]?key|token)([./_-]|$)', re.I)
REDACTIONS = [r'(?i)\b(?:sk-proj-|sk-|ghp_|github_pat_|ghs_|sb_secret_)[A-Za-z0-9_\-]{15,}',
              r'eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',
              r'(?i)(?:bearer\s+)[A-Za-z0-9._-]{15,}',
              r'(?i)((?:password|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)\s*[=:]\s*)[\'\"][^\'\"\n]{8,}[\'\"]']

def clean(value):
    text = str(value or '')
    for pattern in REDACTIONS:
        text = re.sub(pattern, '[REDACTED]', text)
    return text

def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()

def write(path, value):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding='utf-8')

def dump(path, value):
    write(path, json.dumps(value, ensure_ascii=False, indent=2)+'\n')

class Missing(Exception): pass
class API:
    def __init__(self, repo, cache=None, offline=False):
        self.repo, self.cache, self.offline = repo, Path(cache) if cache else None, offline
        self.pending, self.calls = set(), 0
    def get(self, path):
        path = '/repos/'+self.repo+path
        file = self.cache/(hashlib.sha256(path.encode()).hexdigest()+'.json') if self.cache else None
        if file and file.exists():
            data = json.loads(file.read_text())
            if isinstance(data,dict) and '_http_error' in data: raise RuntimeError('HTTP '+str(data['_http_error']))
            return data
        if self.offline:
            self.pending.add(path); raise Missing(path)
        self.calls += 1
        if self.calls > int(os.environ.get('HISTORY_MAX_API_CALLS','3500')):
            raise RuntimeError('API request budget exceeded')
        headers={'Accept':'application/vnd.github+json','User-Agent':'development-history-evidence'}
        if os.environ.get('GITHUB_TOKEN'): headers['Authorization']='Bearer '+os.environ['GITHUB_TOKEN']
        request=urllib.request.Request('https://api.github.com'+path,headers=headers)
        try:
            with urllib.request.urlopen(request,timeout=30) as response: data=json.load(response)
        except urllib.error.HTTPError as error:
            # Do not log request headers, response body, or credentials.
            raise RuntimeError('GitHub HTTP '+str(error.code)) from None
        if file: dump(file,data)
        return data
    def pages(self,path,field=None):
        result=[]
        for page in range(1,101):
            data=self.get(path+('&' if '?' in path else '?')+'per_page=100&page='+str(page))
            batch=data[field] if field else data
            if not isinstance(batch,list): raise ValueError('Unexpected paginated response')
            result.extend(batch)
            if len(batch)<100: return result
        raise RuntimeError('Pagination exceeded; refusing incomplete history')

def git(*args):
    return subprocess.check_output(['git',*args],text=True,stderr=subprocess.DEVNULL)

def ensure_commit(sha):
    """PR metadata can advance after checkout/fetch (e.g. the ledger bot)."""
    if not isinstance(sha,str) or not re.fullmatch(r'[0-9a-f]{40}',sha):
        raise ValueError('Invalid commit SHA')
    try: git('cat-file','-e',sha+'^{commit}')
    except subprocess.CalledProcessError:
        # Fetch the exact observed object, never a moving ref or arbitrary URL.
        git('fetch','--quiet','--no-tags','origin',sha)
        git('cat-file','-e',sha+'^{commit}')

def source(sha,path):
    if SECRET_PATH.search(path) or Path(path).suffix not in SAFE_SUFFIXES:
        return {'path':path,'coverage':'対象外（秘密情報候補／非テキスト）'}
    try:
        size=int(git('cat-file','-s',sha+':'+path))
        if size>120000: return {'path':path,'coverage':'サイズ上限120KB・原本リンク参照'}
        text=clean(git('show',sha+':'+path))
        return {'path':path,'coverage':'全文' if len(text)<=18000 else '先頭18000文字・原本リンク参照',
                'text':text[:18000], 'sha256':hashlib.sha256(text.encode()).hexdigest()}
    except (subprocess.CalledProcessError,ValueError):
        return {'path':path,'coverage':'削除済み／取得不能・差分参照'}

TOPICS = [
 ('雨量・全国検知',r'rain|jma|stride|pixel|forecast|雨|降水|画素|全国', '雨量判定・予測・全国候補抽出に関する変更'),
 ('記憶・会話',r'memory|chat|conversation|relationship|記憶|会話|関係性', '会話や記憶・関係性を扱う処理の変更'),
 ('ラウンジ・画面',r'lounge|video|avatar|animation|ラウンジ|演出', 'ラウンジ・映像・画面演出に関する変更'),
 ('通知・配信',r'notif|push|jaspic|gmail|配信|通知|メール', '通知・メール配信とその運用に関する変更'),
 ('開発管理',r'inventory|ledger|approval|promotion|history|棚卸|台帳|承認|履歴', '開発資産の把握・引継ぎ・レビューを支援する変更'),
 ('認証・安全性',r'auth|rls|security|認証|安全', '認証・アクセス制御に関する変更'),
 ('画面・表示',r'page|ui|display|map|画面|表示|地図', '画面表示や操作に関する変更')]

def describe(title,paths):
    haystack=title+' '+' '.join(paths)
    topics=[(name,purpose) for name,pattern,purpose in TOPICS if re.search(pattern,haystack,re.I)]
    return ([x[0] for x in topics] or ['その他の開発'], '／'.join(x[1] for x in topics) or '変更対象ファイルに関する開発。具体的な目的は原文・差分を確認')

def symbols(text):
    return sorted(set(re.findall(r'(?:function\s+|def\s+|class\s+|(?:export\s+)?(?:async\s+)?(?:const|let)\s+)([A-Za-z_$][\w$]*)',text)))[:60]

def observed_runs(runs):
    return [{'name':clean(r.get('name')), 'head_sha':r.get('head_sha'), 'conclusion':r.get('conclusion'),
             'status':r.get('status'), 'url':r.get('html_url'), 'id':r['id'], 'updated_at':r.get('updated_at'),
             'event':r.get('event')} for r in runs]

def local_files(base,head):
    rows=[]
    for line in git('diff','--no-renames','--numstat',base+'...'+head).splitlines():
        added,removed,path=line.split('\t',2)
        patch='' if SECRET_PATH.search(path) or Path(path).suffix not in SAFE_SUFFIXES else clean(git('diff','--no-ext-diff','--no-renames',base+'...'+head,'--',path))
        if len(patch)>60000: patch=patch[:60000]+'\n[差分は60000文字で打切り・原本参照]'
        status='modified'
        try: git('cat-file','-e',head+':'+path)
        except subprocess.CalledProcessError: status='removed'
        rows.append({'filename':path,'status':status,'additions':int(added) if added.isdigit() else 0,'deletions':int(removed) if removed.isdigit() else 0,'patch':patch})
    return rows

def local_commits(base,head,repo):
    rows=[]
    for sha in git('rev-list','--reverse',base+'..'+head).splitlines():
        rows.append({'sha':sha,'commit':{'message':git('show','-s','--format=%B',sha)},'html_url':'https://github.com/'+repo+'/commit/'+sha})
    return rows

def code_facts(files):
    facts=[]
    patterns=[('HTTP要求',r'\bfetch\s*\(|urlopen\(|requests\.(get|post)'),
              ('DB・ストレージ操作の呼出し',r'\.(rpc|from|insert|upsert|update|delete)\s*\('),
              ('テストの期待値・条件',r'\b(assert|expect|test|it|describe)[.(\s]'),
              ('条件分岐・閾値',r'\bif\s*\(|\bif .+:|\b(?:const|let) [A-Z_]+\s*='),
              ('SQL定義・権限',r'(?i)\b(create|alter|grant|revoke|drop)\s+(table|function|policy|index|select|execute)'),
              ('関数・クラス定義',r'\b(function|def|class)\s+\w+'),
              ('実行する検証コマンド',r'run:|npm (test|run)|python3? .*test')]
    for f in files:
        added=[l[1:] for l in f.get('patch','').splitlines() if l.startswith('+') and not l.startswith('+++')]
        found=0
        for line in added:
            for label,pattern in patterns:
                if re.search(pattern,line):
                    facts.append({'file':f['path'],'kind':label,'expression':clean(line.strip())[:350],'url':f['url']})
                    found+=1;break
            if found>=12:break
    return facts

def collect_pr(api,num,meta,run_index,curated):
    pr=api.get('/pulls/'+num)
    ensure_commit(pr['base']['sha']); ensure_commit(pr['head']['sha'])
    files=local_files(pr['base']['sha'],pr['head']['sha'])
    commits=local_commits(pr['base']['sha'],pr['head']['sha'],api.repo)
    comments=api.pages('/issues/'+num+'/comments')
    reviews=api.pages('/pulls/'+num+'/reviews')
    head=pr['head']['sha']; merge=pr.get('merge_commit_sha') if pr.get('merged_at') else None
    main_status='未統合／未確認'
    candidate=merge or head
    try:
        subprocess.check_call(['git','merge-base','--is-ancestor',candidate,api.main_sha],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        main_status='mainに祖先コミットとして存在（機能受入・本番は別）'
    except subprocess.CalledProcessError:
        main_status='main祖先として未確認（squash・同等実装は別途照合）'
    runs=list(run_index.get(head,[]))+list(run_index.get(merge,[]))
    # Historical head runs can fall outside the current global run window.
    historical=api.pages('/actions/runs?head_sha='+head, 'workflow_runs')
    runs={r['id']:r for r in runs+historical}
    paths=[f['filename'] for f in files]
    topic,purpose=describe(pr['title'],paths)
    texts=[]; evidence=[]
    for f in files:
        path=f['filename']
        safe=not SECRET_PATH.search(path) and Path(path).suffix in SAFE_SUFFIXES
        patch=clean(f.get('patch','')) if safe else ''
        item={'path':path,'status':f['status'],'additions':f['additions'],'deletions':f['deletions'],
              'patch':patch, 'patch_coverage':'git merge-baseから対象HEADへの差分（最大60000文字）' if patch else '差分なし／対象外',
              'url':'https://github.com/'+api.repo+'/blob/'+head+'/'+urllib.parse.quote(path)}
        src=source(head,path); item['source']=src
        texts.append(patch+'\n'+src.get('text','')); evidence.append(item)
    # Related docs are not restricted to files touched by the PR.
    related=[]
    corpus=(pr.get('body') or '')+'\n'+'\n'.join(texts)
    for path in sorted(set(re.findall(r'(?:docs|tests|scripts)/[\w./-]+\.(?:md|json|py|ts)',corpus)))[:40]:
        if path not in paths: related.append(source(head,path))
    curated_entry=curated.get('prs',{}).get(num,{})
    return {'id':'pr-'+num,'number':int(num),'title':clean(pr['title']), 'topics':topic,'purpose':purpose,
            'purpose_basis':'変更パスと表題による分類（意味の確定には原文を確認）',
            'body':clean(pr.get('body')), 'snapshot_head':meta.get('head'), 'snapshot_consistent':not meta.get('head') or meta.get('head')==head, 'head':head,'base':pr['base']['sha'],'base_ref':pr['base']['ref'],
            'head_ref':pr['head']['ref'],'state':'merged' if pr.get('merged_at') else pr['state'],
            'main_status':main_status,'draft':pr.get('draft',False),'merged_at':pr.get('merged_at'),'merge_commit_sha':merge,'updated_at':pr['updated_at'],
            'code_facts':code_facts(evidence),'files':evidence,'file_count':len(files),'reported_file_count':pr.get('changed_files'),
            'commits':[{'sha':c['sha'],'message':clean(c['commit']['message']),'url':c['html_url']} for c in commits],
            'comments':[{'body':clean(c.get('body')),'url':c['html_url']} for c in comments if c.get('user',{}).get('type')!='Bot'],
            'reviews':[{'state':c['state'],'body':clean(c.get('body')),'url':c['html_url']} for c in reviews],
            'runs':observed_runs(list(runs.values())), 'symbols':symbols('\n'.join(texts)),
            'related_sources':related,'curated':curated_entry,
            'implementation':'変更差分を取得。実装の受入完了は未認定',
            'verification':'Actionsの成否は実行単位の事実。製品の受入検証とは別',
            'production':'未確認（main統合／Vercelプレビューから推定しない）',
            'remaining':'受入条件・未解決事項をPR本文、レビュー、台帳と照合',
            'next':'類似コード・既存結論を確認し、未解決条件だけを次の作業にする'}

def branch_case(name,sha,base,repo,prs):
    linked=[p['number'] for p in prs.values() if p.get('head_ref')==name]
    try:
        raw=git('diff','--name-status',base+'...'+sha)
        paths=[line.split('\t')[-1] for line in raw.splitlines()]
        commits=git('log','--format=%H %s',base+'..'+sha).splitlines()
        files=[]
        same_head=any(p.get('head')==sha for p in prs.values())
        for path in paths:
            if same_head:
                files.append({'path':path,'source':{'coverage':'同一HEADのPR案件に原文収録'},'url':'https://github.com/'+repo+'/blob/'+sha+'/'+urllib.parse.quote(path)})
                continue
            src=source(sha,path)
            patch='' if SECRET_PATH.search(path) else clean(git('diff','--no-ext-diff',base+'...'+sha,'--',path))[:18000]
            files.append({'path':path,'source':src,'patch':patch,'url':'https://github.com/'+repo+'/blob/'+sha+'/'+urllib.parse.quote(path)})
        return {'id':'branch-'+digest(name)[:16],'title':clean(name),'head':sha,'head_ref':name,'linked_prs':linked,
                'files':files,'commits':clean('\n'.join(commits)),'topics':describe(name,paths)[0],
                'state':'ブランチ差分（PR関連あり）' if linked else 'PR未関連のブランチ差分',
                'production':'未確認','implementation':'mainとの差分を収録。差分ゼロも記録',
                'next':'関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない'}
    except subprocess.CalledProcessError:
        return {'id':'branch-'+digest(name)[:16],'title':clean(name),'head':sha,'files':[], 'linked_prs':linked,
                'state':'取得不能','topics':['未調査'],'production':'未確認','next':'リモート参照を取得して再解析'}

def search(cases,query):
    tokens=[t.lower() for t in re.split(r'\s+',query.strip()) if t]
    if not tokens: return []
    results=[]
    for c in cases.values():
        text=json.dumps(c,ensure_ascii=False).lower()
        hits=sum(t in text for t in tokens)
        if hits == len(tokens):
            priority=hits+3*sum(t in c.get('title','').lower() for t in tokens)+2*sum(t in json.dumps(c.get('curated',{}),ensure_ascii=False).lower() for t in tokens)
            results.append((priority,c['id'],c))
    return [c for _,_,c in sorted(results,key=lambda x:(-x[0],x[1]))]

def md(value):
    return html.escape(clean(value)).replace('|','&#124;')

def render_case(c,repo):
    num=c.get('number'); lines=['# '+md(c['title']),'']
    if num: lines+=['[PR原本](https://github.com/'+repo+'/pull/'+str(num)+')','']
    for label,key in [('目的','purpose'),('実装状態','implementation'),('検証の扱い','verification'),('PR状態','state'),('main統合','main_status'),('本番反映','production'),('残課題','remaining'),('次の作業','next')]:
        lines+=['**'+label+'：** '+md(c.get(key,'未確認')),'']
    if c.get('linked_prs'):
        lines+=['関連PR：'+', '.join('[#'+str(n)+'](https://github.com/'+repo+'/pull/'+str(n)+')' for n in c['linked_prs']),'']
    if c.get('collected_at'): lines+=['根拠取得日時 (UTC)：'+c['collected_at'],'']
    if c.get('curated'):
        lines+=['## 日本語で確認した成果','',md(c['curated'].get('summary')),'',md(c['curated'].get('conclusion')),'']
        for link in c['curated'].get('evidence',[]): lines+=['- [根拠]('+link+')']
    lines+=['','## 実際の変更処理（コードから抽出）','',md('、'.join(c.get('symbols',[])) or '差分・ソースを参照'),'']
    for fact in c.get('code_facts',[]):
        lines+=['- '+md(fact['kind'])+'：`'+md(fact['expression']).replace('`','&#96;')+'`（['+md(fact['file'])+']('+fact['url']+')）']
    for f in c.get('files',[]):
        lines+=['- ['+md(f['path'])+']('+f['url']+')：'+md(f.get('source',{}).get('coverage','差分参照'))]
    lines+=['','## 検証実行の事実','', '| ワークフロー | 結果 | 対象SHA |','| --- | --- | --- |']
    for r in c.get('runs',[]):
        lines+=['| ['+md(r.get('name'))+']('+str(r.get('url'))+') | '+md(r.get('conclusion') or r.get('status'))+' | '+md(r.get('head_sha'))+' |']
    if not c.get('runs'): lines+=['| 実行証拠未取得 | 未確認 | — |']
    lines+=['','## 当時の説明・結論（原文。作者の主張と実測を区別）','', '```text',clean(c.get('body','')).replace('```','~~~'),'```']
    for item in c.get('comments',[])+c.get('reviews',[]):
        if item.get('body'): lines+=['','[記録元]('+item['url']+')','```text',clean(item['body']).replace('```','~~~'),'```']
    lines+=['','## ソース・テスト・資料の抜粋（実行はしない）','']
    for f in c.get('files',[]):
        text=f.get('patch') or f.get('source',{}).get('text','')
        if text: lines+=['### '+md(f['path']),'','```text',text.replace('```','~~~'),'```','']
    for f in c.get('related_sources',[]):
        if f.get('text'): lines+=['### 関連資料 '+md(f['path']),'','```text',f['text'].replace('```','~~~'),'```','']
    return '\n'.join(lines)+'\n'

def duplicate_candidates(cases):
    by_path={}
    for key,c in cases.items():
        for f in c.get('files',[]):
            p=f['path']
            if p.startswith(('docs/','.github/','tests/')) or p.endswith(('.md','.json','.lock')): continue
            by_path.setdefault(p,set()).add(key)
    return {p:sorted(ids) for p,ids in sorted(by_path.items()) if len(ids)>1}

def render_output(state,out,repo):
    cases=state['cases']; out=Path(out); out.mkdir(parents=True,exist_ok=True)
    lines=['# 日本語開発履歴・着手前検索','', 'コード・差分・コミット・PR議論・Actions実行を同じ案件にまとめた履歴です。分類は自動抽出、重要結論は日本語確認記録です。',
           '', '実装の存在、検証の成功、main統合、本番反映を別々に扱います。未確認を完成扱いしません。',
           '', '更新 (UTC): '+state['generated_at'], '', '## 全案件','', '| 案件 | 分野・日本語作業内容 | 統合状態 | 本番 |','| --- | --- | --- | --- |']
    for key,c in sorted(cases.items()):
        write(out/'cases'/(key+'.md'),render_case(c,repo))
        summary=c.get('curated',{}).get('summary') or c.get('purpose') or 'mainとのソース差分を収録・関連PRを照合'
        lines+=['| ['+md(c['title'])+'](cases/'+key+'.md) | '+md('・'.join(c.get('topics',[]))+'：'+summary)+' | '+md(c.get('state'))+' | 未確認 |']
    lines+=['','## 既存コードの重複候補','', '同じファイルを変更した案件です。同一機能と断定せず、結論と差分を先に照合してください。','']
    duplicates=duplicate_candidates(cases)
    for path,ids in duplicates.items():
        lines+=['- '+md(path)+'：'+', '.join('['+key+'](cases/'+key+'.md)' for key in ids)]
    lines+=['','## 更新と制約','', '- 過去版は revisions/ に追記保存。state.json は次回の差分解析に利用。',
            '- ソースは120KB以下のテキストを最大18000文字ずつ取得。差分省略、取得失敗は原本確認が必要。',
            '- CI結果はコミットSHA付き実行記録。テスト個別の意味・本番動作を保証しない。',
            '- 外部AI APIは呼び出さないため追加AI料金・APIキーは不要。英語原文の全文翻訳・自由な意味理解は行わない。',
            '- 総覧＝製品全体、台帳＝現在の判断、承認ボード＝採否、本履歴＝過去の根拠。']
    write(out/'README.md','\n'.join(lines)+'\n')
    dump(out/'state.json',state); dump(out/'duplicates.json',duplicates)
    # No fetch, CDN, telemetry, application API or executable PR content in viewer.
    cards=[]; search_index=[]
    for key,c in cases.items():
        summary=c.get('curated',{}).get('summary') or c.get('purpose') or 'ブランチ差分を収録'
        index={'id':key,'title':c['title'],'summary':summary,'state':c.get('state'),'main_status':c.get('main_status','未確認'),'topics':c.get('topics',[]),'conclusion':c.get('curated',{}).get('conclusion','未確認'),'next':c.get('next','未確認'),'production':c.get('production','未確認')}
        index['search_text']=' '.join([c['title'],summary,json.dumps(c.get('curated',{}),ensure_ascii=False),c.get('body',''), ' '.join(c.get('symbols',[])), ' '.join(f['path'] for f in c.get('files',[])), ' '.join(f.get('text','')[:5000] for f in c.get('related_sources',[]))])[:22000]
        search_index.append(index)
        cards.append('<article data-search="'+html.escape(index['search_text'],quote=True)+'"><h2>'+html.escape(c['title'])+'</h2><p>'+html.escape(c.get('curated',{}).get('summary') or c.get('purpose') or 'ブランチ差分を収録')+'</p><p>'+html.escape(str(c.get('state')))+' ／ 本番未確認</p><a href="https://github.com/'+repo+'/blob/development-history/docs/work-history/cases/'+key+'.md">コード・結論・検証根拠を読む</a></article>')
    viewer='''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>日本語開発履歴</title><style>body{font:16px system-ui;background:#f3f6fa;color:#162c43;margin:auto;max-width:850px;padding:20px}input{box-sizing:border-box;width:100%;padding:15px;font-size:18px;position:sticky;top:8px}article{background:white;padding:18px;border-radius:14px;margin:14px 0;overflow-wrap:anywhere}h2{font-size:19px}a{color:#075daf}#count{padding:10px}</style><h1>日本語開発履歴</h1><p>着手前に機能名・作業内容・コード・検証結果を検索。空白区切りはAND検索。本番反映は別に確認。</p><input id="q" aria-label="検索キーワード" placeholder="例：z4 stride 47／記憶 会話"><div id="count"></div>'''+''.join(cards)+'''<script>const q=document.getElementById('q'),cards=[...document.querySelectorAll('article')];function run(){const terms=q.value.toLowerCase().trim().split(/\\s+/).filter(Boolean);let n=0;for(const c of cards){c.hidden=!terms.every(t=>c.dataset.search.toLowerCase().includes(t));if(!c.hidden)n++}document.getElementById('count').textContent=n+'件'}q.addEventListener('input',run);run()</script></html>'''
    write(out/'search.html',viewer)
    dump(out/'search-index.json',{'repository':repo,'generated_at':state['generated_at'],'coverage':state['coverage'],'cases':search_index})

def build(report,api,out,previous=None,curated=None):
    curated=curated or {}; previous=previous or {}; old=previous.get('cases',{}); cases={}; errors=[]
    snapshot=report['snapshot']; repo=report['repository']; base=snapshot['branches'][report['default_branch']]
    api.main_sha=base
    # Refresh CI evidence independently from PR update timestamps.
    since=(dt.datetime.fromisoformat(report['generated_at'].replace('Z','+00:00'))-dt.timedelta(days=2)).strftime('%Y-%m-%dT%H:%M:%SZ')
    runs=api.pages('/actions/runs?created='+urllib.parse.quote('>='+since,safe=''),'workflow_runs'); run_index={}
    for r in runs: run_index.setdefault(r['head_sha'],[]).append(r)
    for num,meta in snapshot['prs'].items():
        key='pr-'+num; oldcase=old.get(key)
        ci_digest=digest(observed_runs(run_index[meta.get('head')])) if meta.get('head') in run_index else (oldcase or {}).get('ci_digest',digest([]))
        fingerprint=digest([VERSION,meta,curated.get('prs',{}).get(num),ci_digest])
        if oldcase and oldcase.get('fingerprint')==fingerprint and not oldcase.get('error'):
            cases[key]=dict(oldcase)
            candidate=oldcase.get('merge_commit_sha') or oldcase.get('head')
            if candidate:
                result=subprocess.run(['git','merge-base','--is-ancestor',candidate,base],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                cases[key]['main_status']='mainに祖先コミットとして存在（機能受入・本番は別）' if result.returncode==0 else 'main祖先として未確認（squash・同等実装は別途照合）'
            continue
        try:
            c=collect_pr(api,num,meta,run_index,curated); c['fingerprint']=fingerprint; c['ci_digest']=ci_digest; c['collected_at']=report['generated_at']; cases[key]=c
        except Missing: continue
        except (RuntimeError,ValueError,KeyError,OSError,subprocess.CalledProcessError) as error:
            errors.append({'id':key,'error':type(error).__name__})
            cases[key]=dict(oldcase or {'id':key,'title':clean(meta.get('title')),'state':meta.get('state'),'files':[]})
            cases[key]['error']='今回の証拠収集に失敗。旧結果を保持、再収集が必要'
    for name,sha in snapshot['branches'].items():
        if name in (report['default_branch'],'development-history'): continue
        key='branch-'+digest(name)[:16]; fingerprint=digest([VERSION,name,sha,base])
        if old.get(key,{}).get('fingerprint')==fingerprint: cases[key]=old[key]
        else:
            cases[key]=branch_case(name,sha,base,repo,cases); cases[key]['fingerprint']=fingerprint; cases[key]['collected_at']=report['generated_at']
    # Deleted branches and closed/deleted source records never erase past conclusions.
    for key,c in old.items():
        if key not in cases: cases[key]=dict(c,archived=True)
    if api.pending:
        dump(Path(out)/'pending-requests.json',sorted(api.pending)); return None
    state={'schema_version':VERSION,'repository':repo,'generated_at':report['generated_at'], 'cases':cases,
           'coverage':{'prs':len(snapshot['prs']),'pr_cases':sum(k.startswith('pr-') for k in cases),
                       'branches':len([n for n in snapshot['branches'] if n not in (report['default_branch'],'development-history')]),'errors':errors,'api_calls':api.calls}}
    out=Path(out)
    changes=[]
    for key,c in cases.items():
        # Content-addressed append-only revisions; never overwrite different evidence.
        if digest(c)!=digest(old.get(key,{})):
            dump(out/'revisions'/key/(digest(c)+'.json'),c)
            changes.append({'id':key,'previous':digest(old[key]) if key in old else None,'revision':digest(c)})
    dump(out/'updates'/(digest([report['generated_at'],changes])+'.json'),{'generated_at':report['generated_at'],'changes':changes})
    (out/'pending-requests.json').unlink(missing_ok=True)
    render_output(state,out,repo)
    return state

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--report',default='inventory-output/report.json'); parser.add_argument('--output',default='inventory-output/history')
    parser.add_argument('--previous'); parser.add_argument('--cache'); parser.add_argument('--offline',action='store_true'); parser.add_argument('--query')
    args=parser.parse_args()
    if args.query:
        state=json.loads(Path(args.output,'state.json').read_text())
        for c in search(state['cases'],args.query)[:30]: print(c['id']+' '+c['title']+'\n既存結論: '+c.get('curated',{}).get('conclusion','原本確認')+'\n残課題: '+c.get('remaining','原本確認')+'\n次の作業: '+c.get('next','原本確認')+'\nhttps://github.com/'+state['repository']+'/blob/development-history/docs/work-history/cases/'+c['id']+'.md\n')
        return
    report=json.loads(Path(args.report).read_text()); previous=json.loads(Path(args.previous).read_text()) if args.previous and Path(args.previous).exists() else None
    curated_path=Path('docs/work-history/curated.json'); curated=json.loads(curated_path.read_text()) if curated_path.exists() else {}
    api=API(report['repository'],args.cache,args.offline)
    try: state=build(report,api,args.output,previous,curated)
    except Missing:
        dump(Path(args.output)/'pending-requests.json',sorted(api.pending)); state=None
    if state:
        print(json.dumps(state['coverage'],ensure_ascii=False))
        if state['coverage']['errors']: raise SystemExit(1)
    else: print('Evidence cache incomplete; see pending-requests.json'); raise SystemExit(2)
if __name__=='__main__': main()
