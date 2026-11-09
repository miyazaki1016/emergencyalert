#!/usr/bin/env python3
"""Read-only, evidence-backed check BEFORE implementation. No AI API or app calls.

PR checks repeat the same check as a second line of defence. A candidate is not
a duplicate verdict: the agent must read its evidence and record reuse/extend/
distinct. Text from history and event payloads is data, never executed.
"""
import argparse
from collections import Counter
import datetime as dt
import hashlib
import html
import json
import math
import os
from pathlib import Path
import re
import subprocess
import unicodedata

from development_history_evidence import clean

VERSION = 1
CONCEPTS = {
    '画素の間引き': ['間引', 'ピクセル飛ば', '画素おき', '画素飛ば', 'ピクセルおき', 'stride', 'stride2', 'stride-2', 'stride 2', 'even/even'],
    '全画素走査': ['全画素', '全ピクセル', 'full-pixel', 'full pixel', 'stride1', 'stride-1', 'stride 1', 'exhaustive'],
    'ズーム4': ['ズーム4', 'zoom4', 'zoom 4', 'z4'],
    '全国雨量': ['全国', 'national', '大雨候補', 'coarse candidate'],
    '雨の検知': ['雨雲', '雨量', '降水', 'heavy rain', 'rain', 'レーダー', 'jma'],
    '比較検証': ['比較', '実測', '検証', '測定', 'benchmark', 'parity', 'proof', 'experiment'],
    '性能': ['高速化', '軽量化', '軽く', '処理時間', 'performance', 'scanms', 'decode', '復号', 'メモリ使用'],
    '会話記憶': ['記憶', '想い出', 'memory', 'memories', 'recall'],
    '会話履歴': ['会話履歴', 'チャット履歴', 'conversation history', 'chat history', 'history sync'],
    '匿名の引継ぎ': ['匿名', 'anonymous', 'temporary', 'メール保存', 'email save'],
    '関係性': ['関係性', 'relationship', '親密', '信頼', 'intimacy'],
    '自発会話': ['自発', 'proactive', '自律', 'autonomy', 'body clock', '生活時間'],
    '通知配信': ['通知', '配信', 'notification', 'delivery', 'push'],
    '雨の開始': ['降り始め', '雨の始まり', 'rain onset', 'rain approach'],
    '雨の強まり': ['強まり', 'strengthening'],
    '判定ラボ': ['判定ラボ', 'rainlab', 'rain lab', 'rain-lab'],
    'テスト検出': ['テスト検出', 'テストを認識', 'no test suite', 'vitest', 'node:test'],
    'メール認証': ['gmail', 'oauth', 'メール認証'],
    '開発履歴': ['開発履歴', '作業履歴', '重複開発', 'preflight', 'development history', 'work history'],
    '棚卸し': ['棚卸', 'inventory'],
    '承認': ['承認', 'approval', 'promotion'],
    'ビルド制限': ['ビルド制限', 'ビルド回数', 'build guard', 'quota', 'vercel'],
}
STOP = {'する', 'した', 'して', 'たい', 'ため', 'こと', 'よう', 'ます', 'です', 'ある', 'ない', 'これ', 'それ',
        '修正', '実装', '追加', '確認', '変更', '開発', '対応', '処理', '機能', 'test', 'tests', 'feat', 'fix', 'docs',
        'the', 'and', 'for', 'with', 'from', 'this', 'that', 'into', 'report', 'main', '未確認', '原本'}
ACK_RE = re.compile(r'<!--\s*history-preflight\s*(\{.*?\})\s*-->', re.S)
REPO_RE = re.compile(r'^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')


def normal(text):
    return unicodedata.normalize('NFKC', str(text or '')).lower()


def concepts(text):
    value = normal(text)
    found = {name for name, aliases in CONCEPTS.items() if any(normal(alias) in value for alias in aliases)}
    if re.search(r'テスト.{0,12}(?:認識|検出)', value):
        found.add('テスト検出')
    return found


def tokens(text):
    value = normal(text)
    out = set(re.findall(r'[a-z][a-z0-9_:-]{2,}', value)) - STOP
    for run in re.findall(r'[一-龯ぁ-んァ-ヶー0-9]+', value):
        for size in (2, 3):
            out.update(run[i:i+size] for i in range(len(run)-size+1) if run[i:i+size] not in STOP)
    return out


def case_text(case):
    curated = case.get('curated') or {}
    primary = ' '.join([case.get('title', ''), curated.get('summary', ''), curated.get('conclusion', '')])
    # Long PRs must not win merely because they contain every project keyword.
    secondary = ' '.join([case.get('body', '')[:12000], ' '.join(case.get('symbols', [])),
                          ' '.join(f['path'] for f in case.get('files', []))])
    return primary, secondary


def evidence_links(case, repo):
    root = 'https://github.com/' + repo
    result = [root+'/blob/development-history/docs/work-history/cases/'+case['id']+'.md']
    if case.get('number'):
        result.append(root+'/pull/'+str(case['number']))
    result.extend((case.get('curated') or {}).get('evidence', []))
    result.extend(f.get('url') for f in case.get('files', []) if f.get('url'))
    return list(dict.fromkeys(u for u in result if isinstance(u, str) and u.startswith(root+'/')))


def match_cases(state, task, paths=(), exclude=None, limit=8):
    excluded = {exclude} if isinstance(exclude, str) else set(exclude or [])
    cases = [c for c in state['cases'].values() if c['id'] not in excluded]
    query = tokens(task)
    query_concepts = concepts(task)
    if not query and not paths:
        return []
    documents = [(c, *case_text(c)) for c in cases]
    document_tokens = [(c, p, s, tokens(p), tokens(s)) for c, p, s in documents]
    frequency = Counter(t for _, _, _, p, s in document_tokens for t in (p | s))
    weights = {t: math.log(1 + (len(cases)+1)/(frequency[t]+1)) for t in query}
    total = sum(weights.values()) or 1
    results = []
    for c, primary, secondary, pt, st in document_tokens:
        common = query & (pt | st)
        # Primary findings count in full; body and filenames contribute 30%.
        score = 70*sum(weights[t]*(1 if t in pt else .3) for t in common)/total
        matched_concepts = query_concepts & concepts(primary+' '+secondary)
        primary_concepts = query_concepts & concepts(primary)
        score += min(30, 10*len(primary_concepts))
        overlap = sorted(set(paths) & {f['path'] for f in c.get('files', [])})
        if overlap:
            score += 38
        explicit = bool(c.get('number') and re.search(r'(?:pr\s*#?\s*|#)'+str(c['number'])+r'(?![0-9])', normal(task)))
        if explicit:
            score += 80
        # A generic topic alone (e.g. "notification") is not enough to block work.
        specific = matched_concepts - {'比較検証', '性能', '雨の検知', '通知配信', '承認'}
        required = explicit or bool(overlap) or (score >= 24 and len(primary_concepts) >= 2 and bool(specific))
        if score < 13 and not required:
            continue
        links = evidence_links(c, state['repository'])
        results.append({'id':c['id'], 'title':clean(c['title']), 'score':round(score, 2),
                        'review_required':required, 'matched_concepts':sorted(matched_concepts),
                        'matched_paths':overlap, 'matched_terms':sorted(common, key=lambda t:-weights[t])[:12],
                        'summary':clean((c.get('curated') or {}).get('summary') or c.get('purpose') or c['title']),
                        'conclusion':clean((c.get('curated') or {}).get('conclusion') or '結論未確認。根拠のコード・検証資料を読む'),
                        'remaining':clean(c.get('remaining') or 'PR・検証資料の未解決事項を確認'),
                        'next':clean(c.get('next') or '関連PRと既存実装を照合する'),
                        'state':c.get('state'), 'main_status':c.get('main_status', '未確認'),
                        'production':c.get('production', '未確認'), 'archived':c.get('archived', False),
                        'evidence':links[:12],
                        'runs':[{'name':r.get('name'), 'head_sha':r.get('head_sha'), 'conclusion':r.get('conclusion'), 'url':r.get('url')} for r in c.get('runs', [])][:8]})
    results.sort(key=lambda c:(-c['score'], not c['id'].startswith('pr-'), c['id']))
    # Same-HEAD branches reuse their PR evidence; don't demand duplicate decisions.
    seen_heads = set()
    pr_heads = {state['cases'][c['id']].get('head') for c in results if c['id'].startswith('pr-')}
    output = []
    for item in results:
        head = state['cases'][item['id']].get('head')
        if head and item['id'].startswith('branch-') and head in pr_heads:
            continue
        if head and head in seen_heads:
            continue
        if head:
            seen_heads.add(head)
        output.append(item)
        if len(output) >= limit:
            break
    return output


def coverage_problems(state, now=None, max_age_hours=48):
    now = now or dt.datetime.now(dt.timezone.utc)
    issues = []
    try:
        generated = dt.datetime.fromisoformat(state['generated_at'].replace('Z', '+00:00'))
        age = (now-generated).total_seconds()/3600
        if age > max_age_hours or age < -1:
            issues.append('履歴の更新日時が古い、または未来。日次棚卸しを更新して再照合する')
    except (KeyError, TypeError, ValueError):
        issues.append('履歴の更新日時を確認できない')
    cov = state.get('coverage') or {}
    if cov.get('errors') or not isinstance(cov.get('errors'), list):
        issues.append('履歴の収集エラーまたは収集状態不明')
    active = [c for c in state.get('cases', {}).values() if not c.get('archived')]
    prs = sum(c['id'].startswith('pr-') for c in active)
    if not prs or prs != cov.get('prs'):
        issues.append('全PRの収録件数が一致しない、またはPRがない')
    if sum(c['id'].startswith('branch-') for c in active) != cov.get('branches'):
        issues.append('全作業ブランチの収録件数が一致しない')
    if any(c.get('error') or c.get('state') == '取得不能' for c in active):
        issues.append('証拠取得に失敗した案件がある')
    return issues


def inspect(state, task, paths=(), decisions=(), exclude=None, now=None, max_age_hours=48, revision=None):
    matches = match_cases(state, task, paths, exclude)
    # At most the first three strong candidates must be read; the rest remain visible.
    required = [c for c in matches if c['review_required']][:3]
    supplied = {d.get('id'):d for d in decisions if isinstance(d, dict)}
    unresolved = []
    for case in required:
        decision = supplied.get(case['id'], {})
        if decision.get('decision') not in ('reuse', 'extend', 'distinct') or len(decision.get('reason', '').strip()) < 12 or decision.get('evidence') not in case['evidence']:
            unresolved.append(case['id'])
    problems = coverage_problems(state, now, max_age_hours)
    status = 'INCOMPLETE' if problems else 'REVIEW_REQUIRED' if unresolved else 'REVIEW_RECORDED' if required else 'NO_STRONG_MATCH'
    return {'schema_version':VERSION, 'repository':state['repository'], 'task':clean(task),
            'task_sha256':hashlib.sha256(task.encode()).hexdigest(), 'paths':list(paths),
            'history_generated_at':state.get('generated_at'), 'history_revision':revision,
            'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(), 'coverage':state.get('coverage'),
            'status':status, 'problems':problems, 'required_ids':[c['id'] for c in required],
            'unresolved':unresolved, 'decisions':[{k:clean(v) for k,v in d.items() if k in ('id','decision','reason','evidence')} for d in decisions if isinstance(d,dict)],
            'candidates':matches,
            'notice':'類似度は重複・完成・本番反映の認定ではない。候補なしも新規実装の安全証明ではない。原本を読んで判断する。'}


def markdown(report):
    def esc(s): return html.escape(clean(s)).replace('|', '&#124;')
    lines = ['# 着手前の既存成果自動照合', '', '**結果：'+report['status']+'**', '', esc(report['task']), '',
             '履歴更新：'+str(report['history_generated_at'])+' ／ 履歴版：'+str(report.get('history_revision') or '指定ファイル'), '', report['notice'], '']
    for problem in report['problems']:
        lines += ['- 未確認：'+esc(problem)]
    if report['unresolved']:
        lines += ['', '**実装・再測定を始める前に読む候補：** '+', '.join(report['unresolved']), '',
                  'コード・結論・数値・検証の対象SHA・未解決事項を読み、再利用／追加検証／別案件の理由を記録する。承認依頼ではなく担当AI自身の根拠確認。']
    for c in report['candidates']:
        lines += ['', '## '+esc(c['id']+'：'+c['summary']), '',
                  '一致根拠：'+esc('、'.join(c['matched_concepts']+c['matched_paths']+c['matched_terms'][:5])), '',
                  '**過去の結論：** '+esc(c['conclusion']), '', '**残課題：** '+esc(c['remaining']), '',
                  '**次の作業：** '+esc(c['next']), '',
                  'PR／ブランチ状態：'+esc(c['state'])+' ／ main：'+esc(c['main_status'])+' ／ 本番：'+esc(c['production']), '']
        lines += ['- [原本・コード・検証根拠]('+url+')' for url in c['evidence']]
        for r in c['runs']:
            lines += ['- 検証実行：'+esc(r['name'])+'／'+esc(r['conclusion'])+'／SHA `'+esc(r['head_sha'])+'`（[実行元]('+str(r['url'])+')）']
    if not report['candidates']:
        lines += ['照合候補なし。コード検索・台帳・未収録資料も確認し、再実装の必要性を判断する。']
    if report['decisions']:
        lines += ['', '## 担当AIが確認した再利用判断', '']
        for d in report['decisions']:
            lines += ['- '+esc(d.get('id'))+'：'+esc(d.get('decision'))+'／'+esc(d.get('reason'))+'（[読んだ根拠]('+str(d.get('evidence'))+')）']
    return '\n'.join(lines)+'\n'


def git(*args):
    return subprocess.check_output(['git', *args], text=True, stderr=subprocess.DEVNULL, timeout=120)


def load_history(path=None, repo=None, refresh=True):
    if path:
        return json.loads(Path(path).read_text()), None
    if refresh:
        git('fetch', '--quiet', '--no-tags', 'origin', '+refs/heads/development-history:refs/remotes/origin/development-history')
    revision = git('rev-parse', 'origin/development-history').strip()
    state = json.loads(git('show', revision+':docs/work-history/state.json'))
    if repo and state.get('repository') != repo:
        raise ValueError('Repository/history mismatch')
    return state, revision


def event_task(event):
    item = event.get('pull_request') or event.get('issue') or {}
    body = item.get('body') or ''
    ack = ACK_RE.search(body)
    decisions = json.loads(ack.group(1)).get('decisions', []) if ack else []
    # Never rank the acknowledgment's candidate IDs/URLs as part of the task.
    task = item.get('title', '')+'\n'+ACK_RE.sub('', body)
    exclude = 'pr-'+str(item['number']) if event.get('pull_request') else None
    return task.strip(), decisions, exclude


def event_paths(event):
    pr = event.get('pull_request')
    if not pr:
        return []
    base, head = pr['base']['sha'], pr['head']['sha']
    if not all(re.fullmatch(r'[0-9a-f]{40}', sha) for sha in (base, head)):
        raise ValueError('Invalid commit SHA')
    for sha in (base, head):
        try:
            git('cat-file', '-e', sha+'^{commit}')
        except subprocess.CalledProcessError:
            git('fetch', '--quiet', '--no-tags', 'origin', sha)
    return git('diff', '--name-only', '--no-renames', base+'...'+head).splitlines()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--task'); parser.add_argument('--event'); parser.add_argument('--history')
    parser.add_argument('--paths', nargs='*', default=[]); parser.add_argument('--decisions')
    parser.add_argument('--repo', default=os.environ.get('GITHUB_REPOSITORY'))
    parser.add_argument('--output', default='/tmp/development-preflight')
    parser.add_argument('--no-refresh', action='store_true'); parser.add_argument('--max-age-hours', type=int, default=48)
    args = parser.parse_args()
    output = Path(args.output); output.mkdir(parents=True, exist_ok=True)
    try:
        decisions = json.loads(Path(args.decisions).read_text()) if args.decisions else []
        exclude = None
        if args.event:
            event = json.loads(Path(args.event).read_text())
            task, event_decisions, exclude = event_task(event)
            args.paths = event_paths(event)
            decisions = event_decisions
        else:
            task = args.task or ''
        if len(task.strip()) < 8:
            raise ValueError('Task description too short')
        state, revision = load_history(args.history, args.repo, not args.no_refresh)
        if not REPO_RE.fullmatch(state.get('repository', '')):
            raise ValueError('Invalid repository')
        if args.repo and state['repository'] != args.repo:
            raise ValueError('Repository/history mismatch')
        if args.event and event.get('pull_request'):
            branch = event['pull_request']['head'].get('ref')
            exclude = [exclude]+[c['id'] for c in state['cases'].values()
                                 if c['id'].startswith('branch-') and branch and (c.get('head_ref') or c.get('title')) == branch]
        report = inspect(state, task, args.paths, decisions, exclude, max_age_hours=args.max_age_hours, revision=revision)
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        # No exception messages: command arguments/event content can contain secrets.
        report = {'status':'INCOMPLETE', 'problems':['履歴または作業内容を取得・検証できない。成功扱いせず復旧後に再照合する']}
        (output/'preflight.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
        (output/'preflight.md').write_text('# 着手前の既存成果自動照合\n\nINCOMPLETE：'+report['problems'][0]+'\n')
        print('INCOMPLETE: '+str(output/'preflight.md'))
        return 2
    (output/'preflight.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    (output/'preflight.md').write_text(markdown(report))
    print(markdown(report))
    return 2 if report['status']=='INCOMPLETE' else 3 if report['status']=='REVIEW_REQUIRED' else 0


if __name__ == '__main__':
    raise SystemExit(main())
