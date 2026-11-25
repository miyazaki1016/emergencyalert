import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publishResult, metadata, resultComment, requestFingerprint, MARKER} from '../scripts/development-preflight-publish.mjs';

function fixture({comments=[], current, after, status='REVIEW_REQUIRED', runId=100, runAttempt=1, eventName='issues', action='edited'}={}) {
  const issue={number:174,title:'既存成果を引き継ぐ',body:'依頼本文と判断記録',updated_at:'2026-11-10T03:00:00Z'};
  const context={repo:{owner:'test',repo:'repo'},eventName,payload:{action,issue},runId,sha:'a'.repeat(40)};
  const calls=[];let gets=0;let stored;
  const github={rest:{issues:{
    get:async()=>({data:gets++===0?(current||issue):(after||current||issue)}),
    listComments:()=>{},
    createComment:async x=>{calls.push(['create',x]);stored={id:900,body:x.body,user:{login:'github-actions[bot]'}};return {data:stored}},
    updateComment:async x=>{calls.push(['update',x]);stored={id:x.comment_id,body:x.body,user:{login:'github-actions[bot]'}};return {data:stored}},
    getComment:async()=>({data:stored}),
  }},paginate:async()=>comments};
  const options={github,context,report:{repository:'test/repo',status},markdown:`**結果：${status}**\n原本を確認する`,jobResult:status==='REVIEW_REQUIRED'?'failure':'success',runAttempt};
  return {issue,context,github,options,calls};
}

test('expected review-required failure is published with a discoverable run ID, not called success',async()=>{
  const f=fixture();const result=await publishResult(f.options);
  assert.equal(result.status,'REVIEW_REQUIRED');assert.equal(f.calls.length,2);
  assert.match(f.calls[0][1].body,/結果記録中・公開確認未完了（着手不可）/);
  assert.match(f.calls.at(-1)[1].body,/原本確認・判断記録待ち（着手不可）/);
  assert.match(f.calls.at(-1)[1].body,/actions\/runs\/100/);
  assert.equal(metadata({body:f.calls.at(-1)[1].body,user:{login:'github-actions[bot]'}}).subject_head_sha,null);
});

test('decision recheck updates the bot result instead of creating multiple result comments',async()=>{
  const first=fixture();await publishResult(first.options);
  const old={id:900,user:{login:'github-actions[bot]'},body:first.calls[0][1].body};
  const next=fixture({comments:[old],status:'REVIEW_RECORDED',runId:101});await publishResult(next.options);
  assert.equal(next.calls[0][0],'update');assert.equal(next.calls[0][1].comment_id,900);
  assert.match(next.calls.at(-1)[1].body,/REVIEW_RECORDED/);
});

test('posting or editing the result comment cannot start another analysis or modify Issue body',async()=>{
  for(const eventName of ['issue_comment','pull_request','workflow_dispatch']){
    const f=fixture({eventName});assert.equal((await publishResult(f.options)).posted,false);assert.equal(f.calls.length,0);
  }
  // API mock deliberately has no issues.update method: source body cannot be edited.
  const f=fixture();await publishResult(f.options);assert.equal(f.issue.body,'依頼本文と判断記録');
});

test('old input and old run attempts never overwrite a newer result',async()=>{
  const changed=fixture({current:{number:174,title:'変更された依頼',body:'new'}});
  assert.equal((await publishResult(changed.options)).reason,'request-changed');assert.equal(changed.calls.length,0);
  const newer=fixture({runId:105,runAttempt:2});await publishResult(newer.options);
  const comment={id:900,user:{login:'github-actions[bot]'},body:newer.calls[0][1].body};
  for(const args of [{runId:104},{runId:105,runAttempt:1}]){
    const old=fixture({...args,comments:[comment]});assert.equal((await publishResult(old.options)).reason,'newer-result-exists');assert.equal(old.calls.length,0);
  }
});

test('a concurrent Issue edit makes the posted result SUPERSEDED, preventing stale approval',async()=>{
  const f=fixture({after:{title:'新しい作業',body:'changed',number:174}});
  assert.equal((await publishResult(f.options)).status,'SUPERSEDED');
  assert.equal(f.calls.at(-1)[0],'update');assert.match(f.calls.at(-1)[1].body,/更新前の依頼に対する結果（着手不可）/);
});

test('a human comment with a forged marker is never overwritten',async()=>{
  const first=fixture();await publishResult(first.options);
  const human={id:10,body:first.calls[0][1].body,user:{login:'someone'}};
  const f=fixture({comments:[human]});await publishResult(f.options);assert.equal(f.calls[0][0],'create');
  assert.equal(metadata({body:MARKER+'broken',user:{login:'github-actions[bot]'}}),null);
});

test('missing or wrong-repository analysis produces INCOMPLETE, never permission to begin',async()=>{
  for(const report of [null,{repository:'other/repo',status:'REVIEW_RECORDED'},{status:'SUCCESS'}]){
    const f=fixture();f.options.report=report;const r=await publishResult(f.options);assert.equal(r.status,'INCOMPLETE');
    assert.match(f.calls.at(-1)[1].body,/照合未完了（着手不可）/);
  }
});

test('fingerprint covers decisions, result is bounded and credentials are masked',()=>{
  assert.notEqual(requestFingerprint({body:'reuse'}),requestFingerprint({body:'extend'}));
  const secret='ghp_'+'a'.repeat(36);
  const f=fixture();const meta={analysis_status:'INCOMPLETE',run_id:1,run_attempt:1,run_url:'https://github.com/test/repo/actions/runs/1'};
  const body=resultComment(meta,f.options.report,secret+'\n'+'x'.repeat(80000));
  assert.ok(body.length<65536);assert.ok(!body.includes(secret));assert.match(body,/省略/);
});

test('a successful-looking report from a failed analysis job is not accepted as complete',async()=>{
  const f=fixture({status:'REVIEW_RECORDED'});f.options.jobResult='failure';
  assert.equal((await publishResult(f.options)).status,'INCOMPLETE');
});

test('live analysis fingerprint publishes despite a stale event snapshot (PR #300 rerun case)',async()=>{
  // The rerun's event snapshot still holds the pre-decision body, while the
  // analysis re-fetched the latest Issue. Its fingerprint (of the latest
  // body) must be honoured, not compared against the stale snapshot.
  const f=fixture({status:'REVIEW_RECORDED'});
  f.context.payload.issue={...f.issue,body:'判断記録を入れる前の古い本文'};
  f.options.report={repository:'test/repo',status:'REVIEW_RECORDED',subject_number:174,
    request_sha256:requestFingerprint(f.issue)};
  const result=await publishResult(f.options);
  assert.equal(result.status,'REVIEW_RECORDED');assert.equal(f.calls.length,2);
  const meta=metadata({body:f.calls.at(-1)[1].body,user:{login:'github-actions[bot]'}});
  assert.equal(meta.request_sha256,requestFingerprint(f.issue));
});

test('live analysis fingerprint for another subject or another body is never published',async()=>{
  const wrongSubject=fixture({status:'REVIEW_RECORDED'});
  wrongSubject.options.report={repository:'test/repo',status:'REVIEW_RECORDED',subject_number:999,
    request_sha256:requestFingerprint(wrongSubject.issue)};
  await assert.rejects(()=>publishResult(wrongSubject.options));assert.equal(wrongSubject.calls.length,0);
  const wrongBody=fixture({status:'REVIEW_RECORDED'});
  wrongBody.options.report={repository:'test/repo',status:'REVIEW_RECORDED',subject_number:174,
    request_sha256:requestFingerprint({title:'既存成果を引き継ぐ',body:'分析後に変わった本文'})};
  assert.equal((await publishResult(wrongBody.options)).reason,'request-changed');assert.equal(wrongBody.calls.length,0);
});

test('a failed re-read leaves a non-green pending comment, never an unconfirmed success',async()=>{
  const f=fixture({status:'REVIEW_RECORDED'});let calls=0;
  f.github.rest.issues.get=async()=>{if(calls++)throw Error('API unavailable');return {data:f.issue}};
  await assert.rejects(()=>publishResult(f.options));
  assert.equal(f.calls.length,1);assert.match(f.calls[0][1].body,/PUBLISHING/);
  assert.equal(metadata({body:f.calls[0][1].body,user:{login:'github-actions[bot]'}}).publication_status,'pending');
});
