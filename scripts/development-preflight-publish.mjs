// Publish the EXISTING analysis, never perform a second analysis or execute PR text.
// Called only by the default-branch Issues job with a short-lived issues:write token.
import {createHash} from 'node:crypto';

export const MARKER = '<!-- development-preflight-result:v1\n';
const STATES = new Set(['REVIEW_REQUIRED', 'REVIEW_RECORDED', 'NO_STRONG_MATCH', 'INCOMPLETE']);
const LABELS = {REVIEW_REQUIRED:'原本確認・判断記録待ち（着手不可）', REVIEW_RECORDED:'判断記録を確認',
  NO_STRONG_MATCH:'強い候補なし（通常のコード確認は必要）', INCOMPLETE:'照合未完了（着手不可）',
  SUPERSEDED:'更新前の依頼に対する結果（着手不可）', PUBLISHING:'結果記録中・公開確認未完了（着手不可）'};

export function requestFingerprint(issue) {
  return createHash('sha256').update(JSON.stringify([issue.title || '', issue.body || ''])).digest('hex');
}

export function metadata(comment) {
  if (comment.user?.login !== 'github-actions[bot]' || !comment.body?.startsWith(MARKER)) return null;
  try {
    const end = comment.body.indexOf('\n-->', MARKER.length);
    const data = JSON.parse(comment.body.slice(MARKER.length, end));
    return data.schema_version === 1 && Number.isSafeInteger(data.run_id) && Number.isSafeInteger(data.run_attempt) ? data : null;
  } catch { return null; }
}

export function redact(text) {
  return String(text || '')
    .replace(/\b(?:sk-proj-|sk-|ghp_|github_pat_|ghs_|sb_secret_)[A-Za-z0-9_-]{15,}/g, '[REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED]')
    .replace(/bearer\s+[A-Za-z0-9._-]{15,}/gi, '[REDACTED]')
    .replace(/((?:password|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)\s*[=:]\s*)['"][^'"\n]{8,}['"]/gi, '$1[REDACTED]');
}

export function resultComment(meta, report, markdown) {
  const display = meta.publication_status === 'pending' ? 'PUBLISHING' : meta.analysis_status;
  const status = LABELS[display];
  const heading = `${MARKER}${JSON.stringify(meta)}\n-->\n## 着手前の自動照合結果\n\n`+
    `**${display}：${status}**\n\n`+
    `[Actions実行 ID ${meta.run_id}・試行 ${meta.run_attempt}](${meta.run_url})\n\n`+
    `依頼編集時刻：${meta.request_updated_at} ／ 依頼の指紋：\`${meta.request_sha256}\`\n\n`+
    'この結果は着手前の既存成果照合です。引継ぎ成功、新規変更の最新HEADのテスト成功、開発案件の完成とは別です。\n'+
    'Issue本文の依頼内容・判断記録が下の検証対象と一致するか確認してください。本文が変わった場合は新しい結果を待ち、古い成功を使わないでください。\n\n';
  const fallback = `# 着手前照合\n\n${report?.status || 'INCOMPLETE'}：照合結果を取得できませんでした。着手しないでください。\n`;
  const clean = redact(markdown || fallback);
  // GitHub's comment limit is 65,536 characters. Keep the run ID even if truncated.
  const suffix = clean.length > 48000 ? '\n\n（長い結果は省略。上の実行IDからジョブログ・成果物をGitHub連携で取得できます。）\n' : '';
  return heading+clean.slice(0, 48000)+suffix;
}

function newer(existing, proposed) {
  return existing.run_id > proposed.run_id ||
    (existing.run_id === proposed.run_id && existing.run_attempt > proposed.run_attempt);
}

export async function publishResult({github, context, report, markdown, jobResult, runAttempt=1}) {
  if (context.eventName !== 'issues' || !['opened','edited','reopened'].includes(context.payload.action)) {
    return {posted:false, reason:'not-an-issues-request'};
  }
  const snapshot = context.payload.issue;
  if (!snapshot || snapshot.pull_request || !Number.isSafeInteger(snapshot.number)) throw Error('Invalid Issue event');
  const {owner, repo} = context.repo;
  const current = (await github.rest.issues.get({owner,repo,issue_number:snapshot.number})).data;
  const fingerprint = requestFingerprint(snapshot);
  if (requestFingerprint(current) !== fingerprint) return {posted:false, reason:'request-changed'};
  const valid = STATES.has(report?.status) && (!report.repository || report.repository === `${owner}/${repo}`) &&
    !(jobResult !== 'success' && ['REVIEW_RECORDED','NO_STRONG_MATCH'].includes(report.status));
  const analysisStatus = valid ? report.status : 'INCOMPLETE';
  const meta = {schema_version:1, issue_number:snapshot.number, repository:`${owner}/${repo}`,
    request_sha256:fingerprint, request_updated_at:snapshot.updated_at,
    run_id:Number(context.runId), run_attempt:Number(runAttempt),
    run_url:`https://github.com/${owner}/${repo}/actions/runs/${Number(context.runId)}`,
    analysis_status:analysisStatus, publication_status:'confirmed', preflight_job_result:jobResult,
    analysis_commit_sha:context.sha, subject_head_sha:null};
  if (!Number.isSafeInteger(meta.run_id) || !Number.isSafeInteger(meta.run_attempt)) throw Error('Invalid run identity');
  const comments = await github.paginate(github.rest.issues.listComments,{owner,repo,issue_number:snapshot.number,per_page:100});
  const owned = comments.map(c=>({comment:c,meta:metadata(c)})).filter(x=>x.meta)
    .sort((a,b)=>b.meta.run_id-a.meta.run_id || b.meta.run_attempt-a.meta.run_attempt || b.comment.id-a.comment.id);
  const existing = owned[0];
  if (existing && newer(existing.meta, meta)) return {posted:false,reason:'newer-result-exists'};
  // Do not expose a green result until the source and managed comment are re-read.
  const safeReport = valid ? report : {status:'INCOMPLETE'};
  const safeMarkdown = valid ? markdown : null;
  const body = resultComment({...meta,publication_status:'pending'}, safeReport, safeMarkdown);
  const response = existing ? await github.rest.issues.updateComment({owner,repo,comment_id:existing.comment.id,body}) :
    await github.rest.issues.createComment({owner,repo,issue_number:snapshot.number,body});
  // An edit racing with publication must not leave a reusable green result.
  const after = (await github.rest.issues.get({owner,repo,issue_number:snapshot.number})).data;
  const latest = (await github.rest.issues.getComment({owner,repo,comment_id:response.data.id})).data;
  const latestMeta = metadata(latest);
  if (latestMeta?.run_id !== meta.run_id || latestMeta.run_attempt !== meta.run_attempt) {
    return {posted:false,reason:'managed-result-changed'};
  }
  if (requestFingerprint(after) !== fingerprint) {
    await github.rest.issues.updateComment({owner,repo,comment_id:latest.id,
      body:resultComment({...meta,analysis_status:'SUPERSEDED',publication_status:'superseded'},safeReport,safeMarkdown)});
    return {posted:true,status:'SUPERSEDED',issue_number:snapshot.number};
  }
  await github.rest.issues.updateComment({owner,repo,comment_id:latest.id,body:resultComment(meta,safeReport,safeMarkdown)});
  return {posted:true,status:analysisStatus,issue_number:snapshot.number};
}
