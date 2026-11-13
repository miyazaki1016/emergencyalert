"use client";

import { createClient } from "@supabase/supabase-js";
import { useMemo, useState } from "react";

type CandidateDetail = { key: string; classification: "NEW_ID" | "UPDATED"; occurrenceDate: string | null; publicationDate: string | null };
type ProvinceResult = { province: "hiroshima" | "shiga"; count: number; quarantined: number; details?: CandidateDetail[] };
type PreviewResult = {
  mode?: string; safeToSend?: boolean; total?: number; limit?: number;
  unresolvedDeliveries?: number; runningRuns?: number; provinces?: ProvinceResult[]; error?: string;
};

export default function JaspicPreviewButton() {
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState("");
  async function check() {
    if (!client || busy) return;
    setBusy(true); setResult(null); setError("");
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) { setError("管理者としてログインしてから実行してください。"); return; }
      const response = await fetch("/jaspic/oauth/preview", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { authorization: "Bearer " + session.access_token },
      });
      const body: PreviewResult = await response.json();
      if (!response.ok || body.mode !== "READ_ONLY") {
        setError("確認できませんでした（" + (body.error ?? response.status) + "）。メールは送信していません。");
        return;
      }
      setResult(body);
    } catch { setError("通信エラーで確認できませんでした。メールは送信していません。"); }
    finally { setBusy(false); }
  }
  return <section style={{border:"1px solid #c6d4e2",borderRadius:12,padding:16,margin:"22px 0",background:"#f3f7fc"}}>
    <h2 style={{fontSize:20,marginTop:0}}>広島・滋賀 送信前チェック</h2>
    <p>現在の公開情報から候補件数を確認します。メール送信・配信台帳の変更は行いません。</p>
    <button type="button" onClick={()=>void check()} disabled={!client || busy}
      style={{fontSize:17,padding:"12px 20px",borderRadius:9,minHeight:48}}>
      {busy ? "確認中…" : "送信前チェック"}
    </button>
    {error && <p role="alert">{error}</p>}
    {result && <div role="status" aria-live="polite">
      <p><strong>送信候補：合計 {result.total ?? "不明"} 件</strong>（上限 {result.limit ?? "不明"} 件）</p>
      {(result.provinces ?? []).map(p=><p key={p.province}>
        {p.province === "hiroshima" ? "広島" : "滋賀"}：候補 {p.count} 件／隔離 {p.quarantined} 件
      </p>)}
      {(result.provinces ?? []).map(p => <details key={p.province} style={{margin:"12px 0"}}>
        <summary style={{cursor:"pointer",fontWeight:600}}>{p.province === "hiroshima" ? "広島" : "滋賀"}の候補IDと内訳（{p.details?.length ?? 0}件）</summary>
        <p style={{fontSize:13}}>「新規ID」は前回保存データにないID、「更新」は既存IDの内容変更です。発生日は掲載日ではありません。掲載日時は取得できないため、昨日以降の掲載かは未確定です。</p>
        <ol style={{paddingLeft:24,fontSize:14}}>
          {(p.details ?? []).map(d => <li key={d.key} style={{marginBottom:8,overflowWrap:"anywhere"}}>
            <code>{d.key}</code> ／ {d.classification === "NEW_ID" ? "新規ID" : "既存ID更新"}
            ／ 発生日：{d.occurrenceDate ?? "不明"} ／ 掲載日：{d.publicationDate ?? "不明"}
          </li>)}
        </ol>
      </details>)}
      <p>未解決配信：{result.unresolvedDeliveries ?? "不明"} 件／実行中：{result.runningRuns ?? "不明"} 件</p>
      <p><strong>{result.safeToSend ? "候補件数と台帳の基本チェックは範囲内" : "送信条件を満たしていません"}</strong></p>
      <small>※チェック結果は送信許可ではありません。実送信前に認証・取得結果・全安全条件の別確認が必要です。</small>
    </div>}
  </section>;
}
