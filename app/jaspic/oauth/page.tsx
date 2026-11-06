import type { Metadata } from "next";
import Link from "next/link";
import JaspicOauthLoginClient from "./login-client";

export const metadata: Metadata = {
  title: "JASPIC | Gmail認証",
  robots: { index: false, follow: false },
};

export default function JaspicOAuthPage() {
  return (
    <main style={{ maxWidth: 700, margin: "24px auto", padding: "clamp(18px, 5vw, 32px)", borderRadius: 16, background: "#fff", color: "#162436", lineHeight: 1.65, fontSize: 16, overflowWrap: "anywhere" }}>
      <p style={{ fontSize: 13, color: "#476280" }}>JASPIC / 運営者本人専用</p>
      <h1 style={{ fontSize: "clamp(24px, 6vw, 32px)", lineHeight: 1.3 }}>Gmail認証</h1>
      <p>Gmail APIの認証は管理者本人だけが行えます。ログインにはSupabase Authを使用します。</p>
      <p style={{ border: "1px solid #c6d4e2", borderRadius: 12, padding: 16, background: "#f3f7fc", fontSize: 15 }}>
        GoogleのGmail送信権限を再認証し、認証情報を暗号化して保存できます。
        メールの実送信・18時の自動配信も開始されません。
      </p>
      <JaspicOauthLoginClient />
      <p style={{fontSize:13}}>クライアントシークレットやリフレッシュトークンはこの画面に入力しないでください。</p>
      <p style={{ fontSize: 15 }}><Link href="/jaspic">JASPICの説明ページに戻る</Link></p>
    </main>
  );
}
