import type { Metadata } from "next";
import Link from "next/link";
import JaspicOauthLoginClient from "./login-client";

export const metadata: Metadata = {
  title: "JASPIC | Gmail認証の準備",
  robots: { index: false, follow: false },
};

export default function JaspicOAuthPage() {
  return (
    <main style={{ maxWidth: 700, margin: "56px auto", padding: "32px 26px", borderRadius: 16, background: "#fff", color: "#162436", lineHeight: 1.8 }}>
      <p style={{ fontSize: 13, color: "#476280" }}>JASPIC / 運営者本人専用</p>
      <h1>Gmail認証</h1>
      <p>Gmail APIの認証は管理者本人だけが行えます。ログインにはSupabase Authを使用します。</p>
      <p style={{ border: "1px solid #c6d4e2", borderRadius: 12, padding: 16, background: "#f3f7fc" }}>
        Google認証は開発中のため現在停止しています。安全確認と管理者設定が完了するまで利用できません。
        メールの実送信・18時の自動配信も開始されません。
      </p>
      <JaspicOauthLoginClient />
      <p style={{fontSize:13}}>クライアントシークレットやリフレッシュトークンはこの画面に入力しないでください。</p>
      <p><Link href="/jaspic">JASPICの説明ページに戻る</Link></p>
    </main>
  );
}
