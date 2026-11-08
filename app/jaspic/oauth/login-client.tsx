"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

function getBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  });
}

/**
 * iPhone Safari email OTP login. No OAuth client secret or refresh token is
 * ever exposed to JS. The auth start route must recheck the user on the server.
 */
export default function JaspicOauthLoginClient() {
  const supabase = useMemo(getBrowserClient, []);
  const [email, setEmail] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"checking" | "authorized" | "denied">("checking");
  const [vault, setVault] = useState<"empty" | "saved" | "unavailable">("unavailable");
  const [oauthExpiry, setOauthExpiry] = useState<"unknown" | "normal" | "approaching" | "possibly-expired">("unknown");
  const [oauthDates, setOauthDates] = useState<{lastSavedAt:string;recommendedAt:string;estimatedExpiryAt:string} | null>(null);
  const [prefectureDelivery, setPrefectureDelivery] = useState<Record<string, {total:number;statuses:Record<string,number>}> | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<{status: string; errorCode: string | null; updatedAt: string} | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getUser().then(({data}) => {
      if (active) setLoggedIn(Boolean(data.user));
    }).catch(() => { if (active) setLoggedIn(false); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => {
      if (active) setLoggedIn(Boolean(session?.user));
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !loggedIn) {
      setAdminStatus("checking");
      return;
    }
    let active = true;
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { if (active) setAdminStatus("denied"); return; }
        const response = await fetch("/jaspic/oauth/status", {
          headers: { authorization: "Bearer " + session.access_token },
          cache: "no-store",
        });
        const result = await response.json();
        if (active) {
          setAdminStatus(response.ok ? "authorized" : "denied");
          setVault(result.vault === "saved" || result.vault === "empty" ? result.vault : "unavailable");
          setOauthExpiry(["normal", "approaching", "possibly-expired"].includes(result.oauthExpiry) ? result.oauthExpiry : "unknown");
          const dates = result.oauthDates;
          setOauthDates(dates && [dates.lastSavedAt, dates.recommendedAt, dates.estimatedExpiryAt].every((v:unknown) => typeof v === "string" && Number.isFinite(Date.parse(v))) ? dates : null);
          setDeliveryStatus(result.deliveryStatus ?? null);
          setPrefectureDelivery(result.prefectureDelivery ?? null);
        }
      } catch {
        if (active) setAdminStatus("denied");
      }
    })();
    return () => { active = false; };
  }, [supabase, loggedIn]);

  async function beginSendConsent() {
    if (!supabase || busy || adminStatus !== "authorized") return;
    setBusy(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setMessage("先にメールでログインしてね。"); return; }
      const response = await fetch("/jaspic/oauth/send-start", {
        method: "POST", credentials: "same-origin",
        headers: { authorization: "Bearer " + session.access_token },
        cache: "no-store",
      });
      if (!response.ok) { setMessage("Gmail認証を開始できませんでした。管理者のログイン状態と設定を確認してください。"); return; }
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("authorizationUrl" in body) ||
          typeof body.authorizationUrl !== "string") throw new Error("Unavailable");
      const target = new URL(body.authorizationUrl);
      if (target.origin !== "https://accounts.google.com" || target.pathname !== "/o/oauth2/v2/auth")
        throw new Error("Unavailable");
      window.location.assign(target.href);
    } catch { setMessage("送信権限の確認を開始できませんでした。"); }
    finally { setBusy(false); }
  }

  async function removeSavedConsent() {
    if (!supabase || busy || adminStatus !== "authorized" ||
        !window.confirm("このサイトに保存したGmail認証情報を削除しますか？")) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Unavailable");
      const response = await fetch("/jaspic/oauth/status", {
        method: "DELETE", credentials: "same-origin",
        headers: { authorization: "Bearer " + session.access_token },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Unavailable");
      setVault("empty");
      setMessage("このサイトに保存したGmail認証情報を削除しました。");
    } catch { setMessage("Gmail認証情報を削除できませんでした。"); }
    finally { setBusy(false); }
  }

  async function sendSingleTest() {
    if (!supabase || busy || adminStatus !== "authorized" || vault !== "saved" ||
        !window.confirm("管理者本人宛てにテストメールを1通だけ送信します。よろしいですか？")) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Unavailable");
      const response = await fetch("/jaspic/oauth/test-send", {
        method: "POST", credentials: "same-origin",
        headers: { authorization: "Bearer " + session.access_token },
        cache: "no-store",
      });
      const result: unknown = await response.json();
      const code = result && typeof result === "object" && "result" in result ? String(result.result) : "";
      setMessage(response.ok ? "テストメールを1通送信しました。Gmailの受信箱を確認してください。" :
        code === "already-claimed-or-unavailable" ? "テスト送信はすでに実行済み、または利用できません。再送しません。" :
        "テスト送信できませんでした（" + (code || response.status) + "）。再送はせず、状況を確認してください。");
    } catch { setMessage("送信結果を確認できません。重複防止のため再操作せず、管理者に確認してください。"); }
    finally { setBusy(false); }
  }

  async function emailLogin() {
    if (!supabase || busy || !email.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const {error} = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: "https://emergencyalert.news/jaspic/oauth", shouldCreateUser: false },
      });
      setMessage(error ? "ログイン用メールを送信できませんでした。設定を確認してください。" :
        "ログイン用メールを送ったよ。メール内のリンクをSafariで開いてね。");
    } catch { setMessage("ログインの準備ができていません。"); }
    finally { setBusy(false); }
  }


  return (
    <section>
      {!supabase && <p role="status">ログイン設定はまだ完了していません。</p>}
      {supabase && !loggedIn && <>
        <label htmlFor="jaspic-email">管理者のメールアドレス</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"10px 0"}}>
          <input id="jaspic-email" type="email" value={email}
            onChange={(e)=>setEmail(e.target.value)} autoComplete="email"
            style={{fontSize:16,padding:12,minWidth:230,border:"1px solid #a5bbd0",borderRadius:8}} />
          <button type="button" onClick={()=>void emailLogin()} disabled={busy || !email.trim()}
            style={{fontSize:16,padding:"12px 16px",borderRadius:8}}>ログイン用メールを送る</button>
        </div>
      </>}
      {supabase && loggedIn && <>
        <p>Supabase Authにログイン済みです。管理者本人であることは、次の操作でサーバー側でも確認されます。</p>
        <p role="status" aria-live="polite">{adminStatus === "checking"
          ? "管理者権限を確認しています。"
          : adminStatus === "authorized"
            ? "管理者権限を確認しました。Google認証の開始はサーバー設定によって制御されています。"
            : "管理者権限は未確認です。管理者設定の完了をお待ちください。"}</p>
        {adminStatus === "authorized" && <p role="status">{vault === "saved"
          ? "Gmail認証情報は暗号化して保存済みです。"
          : vault === "empty" ? "Gmail認証情報は未保存です。" : "Gmail認証情報の保存状態を確認できません。"}</p>}
        {adminStatus === "authorized" && vault === "saved" && <div role="status"
          style={{padding:12,border:"1px solid #a5bbd0",borderRadius:8,margin:"12px 0",
            background:oauthExpiry === "possibly-expired" ? "#fff0ef" : oauthExpiry === "approaching" ? "#fff8e7" : "#f0faf3"}}>
          <strong>Gmail認証の期限目安</strong>
          {oauthDates ? <>
            <p>最終保存日：{new Date(oauthDates.lastSavedAt).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"})}</p>
            <p>再認証の推奨日：{new Date(oauthDates.recommendedAt).toLocaleDateString("ja-JP",{timeZone:"Asia/Tokyo"})}</p>
            <p>推定有効期限：{new Date(oauthDates.estimatedExpiryAt).toLocaleDateString("ja-JP",{timeZone:"Asia/Tokyo"})}</p>
          </> : <p>日時を確認できません。</p>}
          <small>※Google OAuthがテストモードの場合の7日間を仮定した目安です。保存日時を起点としており、Googleが保証する有効期限や送信可否ではありません。</small>
        </div>}
        {adminStatus === "authorized" && prefectureDelivery && <div role="status"
          style={{padding:12,border:"1px solid #a5bbd0",borderRadius:8,margin:"12px 0"}}>
          <strong>広島・滋賀 配信台帳（読み取り専用）</strong>
          {(["hiroshima", "shiga"] as const).map(province => <p key={province}>
            {province === "hiroshima" ? "広島" : "滋賀"}：
            {prefectureDelivery[province]?.total ?? 0}件
            {" ／ "}{Object.entries(prefectureDelivery[province]?.statuses ?? {})
              .map(([status,count]) => status + " " + count + "件").join("、") || "記録なし"}
          </p>)}
          <small>※台帳上の状態であり、Gmail送信成功・受信成功を保証するものではありません。配信は開始しません。</small>
        </div>}
        {adminStatus === "authorized" && deliveryStatus && <p role="status"
          style={{padding:12,border:"1px solid #a5bbd0",borderRadius:8}}>
          Gmailテスト送信の最終記録：
          {deliveryStatus.status === "sent" ? "送信成功" :
            deliveryStatus.status === "failed" ? "送信失敗（再認証・設定の確認が必要）" :
            "送信処理を開始済み（結果未確認）"}
          {" ／ "}{new Date(deliveryStatus.updatedAt).toLocaleString("ja-JP")}
          {deliveryStatus.status === "failed" && <span> ／ エラー: {deliveryStatus.errorCode}</span>}
          <br />※管理者宛てのテスト送信のみの記録です。広島・滋賀の配信状況ではありません。
        </p>}
        {adminStatus === "authorized" && vault === "saved" && oauthExpiry !== "normal" && <p role="alert"
          style={{padding:12,border:"1px solid #e8a34e",borderRadius:8,background:"#fff8e7",color:"#6c4100"}}>
          {oauthExpiry === "approaching"
            ? "⚠️ Gmail認証から約6日経過。テストモードでは間もなく再認証が必要になる可能性があります。"
            : oauthExpiry === "possibly-expired"
              ? "⚠️ Gmail認証から7日以上経過。送信できない可能性があります。下のボタンから再認証してください。"
              : "Gmail認証の有効期限を確認できません。送信エラーがあれば再認証してください。"}
          <br />※これは保存日時による推定で、実際の送信失敗を確認した表示ではありません。
        </p>}
        {adminStatus === "authorized" && (vault !== "saved" || oauthExpiry !== "normal") && <button
          type="button" onClick={()=>void beginSendConsent()} disabled={busy}
          style={{fontSize:16,padding:"12px 18px",borderRadius:8}}>
          {vault === "empty" ? "Gmailを認証して暗号化保存" :
            oauthExpiry === "approaching" ? "Gmailの期限が近づいています・再認証" :
            oauthExpiry === "possibly-expired" ? "Gmailの再認証が必要な可能性があります" :
            "Gmailの認証状態を確認・再認証"}
        </button>}
        {adminStatus === "authorized" && vault === "saved" && <button type="button"
          onClick={()=>void sendSingleTest()} disabled={busy}
          style={{fontSize:16,padding:"12px 18px",borderRadius:8,marginTop:12}}>管理者宛てにテストメールを1通送信</button>}
        {adminStatus === "authorized" && vault !== "empty" && <button type="button"
          onClick={()=>void removeSavedConsent()} disabled={busy}
          style={{fontSize:16,padding:"12px 18px",borderRadius:8}}>保存情報を削除</button>}
        <button type="button" onClick={()=>void supabase.auth.signOut()} disabled={busy}
          style={{fontSize:16,padding:"12px 18px",marginLeft:8,borderRadius:8}}>ログアウト</button>
      </>}
      {message && <p role="status" aria-live="polite">{message}</p>}
    </section>
  );
}
