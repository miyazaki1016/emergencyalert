import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "JASPIC | Gmail認証の準備状況",
  robots: { index: false, follow: false },
};

export default function JaspicOAuthPage() {
  return (
    <main style={{ maxWidth: 700, margin: "56px auto", padding: "32px 26px", borderRadius: 16, background: "#fff", color: "#162436", lineHeight: 1.8 }}>
      <p style={{ fontSize: 13, color: "#476280" }}>JASPIC / 管理者用</p>
      <h1>Gmail認証の準備状況</h1>
      <p>この画面は開発中です。現在、Googleの認証開始は無効になっています。</p>
      <p>本人確認・認証状態の一度限りの消費・暗号化トークン保存を実環境で検証してから、管理者のみが認証を開始できるようにします。</p>
      <p style={{ border: "1px solid #c6d4e2", borderRadius: 12, padding: 16, background: "#f3f7fc" }}>
        <strong>認証を開始できません</strong><br />
        Gmailの実送信も自動実行も停止中です。ここにはクライアントID・シークレット・認証コードを入力しないでください。
      </p>
      <p><Link href="/jaspic">JASPICの説明ページに戻る</Link></p>
    </main>
  );
}
