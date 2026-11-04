"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

function getBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

  async function emailLogin() {
    if (!supabase || busy || !email.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const {error} = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: "https://emergencyalert.news/jaspic/oauth" },
      });
      setMessage(error ? "ログイン用メールを送信できませんでした。設定を確認してください。" :
        "ログイン用メールを送ったよ。メール内のリンクをSafariで開いてね。");
    } catch { setMessage("ログインの準備ができていません。"); }
    finally { setBusy(false); }
  }

  async function beginGoogle() {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const {data:{session}} = await supabase.auth.getSession();
      if (!session) { setMessage("先にメールでログインしてね。"); return; }
      const response = await fetch("/jaspic/oauth/start", {
        method: "POST",
        credentials: "same-origin",
        headers: { authorization: "Bearer " + session.access_token },
        cache: "no-store",
      });
      if (!response.ok) { setMessage("Google認証は現在停止中です。管理者設定を確認してね。"); return; }
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("authorizationUrl" in body) ||
          typeof body.authorizationUrl !== "string") throw new Error("Unavailable");
      const target = new URL(body.authorizationUrl);
      if (target.origin !== "https://accounts.google.com" || target.pathname !== "/o/oauth2/v2/auth") {
        throw new Error("Unavailable");
      }
      window.location.assign(target.href);
    } catch { setMessage("認証開始に失敗しました。"); }
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
        <button type="button" onClick={()=>void beginGoogle()} disabled={busy}
          style={{fontSize:16,padding:"12px 18px",borderRadius:8}}>Google Gmailの認証を開始</button>
        <button type="button" onClick={()=>void supabase.auth.signOut()} disabled={busy}
          style={{fontSize:16,padding:"12px 18px",marginLeft:8,borderRadius:8}}>ログアウト</button>
      </>}
      {message && <p role="status" aria-live="polite">{message}</p>}
    </section>
  );
}
