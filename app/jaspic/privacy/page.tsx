import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | JASPIC Mail Automation",
  description: "JASPIC Mail AutomationにおけるGoogleユーザーデータと警察公開情報の取り扱いについて。",
  alternates: { canonical: "https://emergencyalert.news/jaspic/privacy" },
};

const panel = { maxWidth: 740, margin: "52px auto", padding: "32px 26px", background: "#fff", borderRadius: 16, color: "#162436", lineHeight: 1.8, boxShadow: "0 8px 30px rgba(0,0,0,.14)" } as const;

export default function JaspicPrivacyPage() {
  return (
    <main style={panel}>
      <p style={{ fontSize: 13, color: "#476280" }}><Link href="/jaspic">JASPIC Mail Automation</Link></p>
      <h1 style={{ fontSize: 29, lineHeight: 1.4 }}>プライバシーポリシー</h1>
      <p>最終更新日：2026年11月5日</p>
      <h2 style={{ fontSize: 20 }}>1. 運営と利用範囲</h2>
      <p>JASPIC Mail Automation（以下「本ツール」）は、運営者本人が管理する、警察公開情報を用いたメール連絡の補助ツールです。一般向けのアカウント登録や第三者への利用提供は想定していません。</p>
      <h2 style={{ fontSize: 20 }}>2. 取得・利用する情報</h2>
      <p>本ツールは、広島県警・滋賀県警が公開する防犯関連データを取得・比較します。Googleアカウントについては、本人による許可を得た場合に限り、Gmail APIの <code>gmail.send</code> 権限を使用して通知メールを送信する設計です。Gmailの受信メールを閲覧・検索・削除する権限は、本ツールの送信機能には必要ありません。</p>
      <h2 style={{ fontSize: 20 }}>3. 利用目的と共有先</h2>
      <p>Googleから取得した認証情報は、運営者が指定した通知メールをGmail経由で送信する認証に使用します。生成した通知文は指定された受信先に送付することを想定しており、広告、販売、利用者の行動追跡などには利用しません。</p>
      <h2 style={{ fontSize: 20 }}>4. 保管と安全対策</h2>
      <p>OAuth認証情報は、ソースコードや公開ページに記載せず、送信機能を稼働させる場合はサーバー側の秘密情報管理機能で保護します。取得した公開情報と送信処理の状態は、業務上必要な範囲で管理します。保管期間や削除手順の詳細は、本番運用設計の確定時に更新します。</p>
      <h2 style={{ fontSize: 20 }}>5. Googleユーザーデータ</h2>
      <p>Googleユーザーデータへのアクセスは、本人が許可した送信目的に限定します。取得した認証情報を広告用途に提供したり、第三者に販売したりしません。権限の取り消しは、Googleアカウントのセキュリティ設定から行えます。</p>
      <h2 style={{ fontSize: 20 }}>6. ポリシーの変更</h2>
      <p>送信機能やデータ保管方法が変わった場合は、実際の運用に合わせて本ページを更新します。</p>
      <p style={{ marginTop: 32 }}><Link href="/jaspic">← サービス概要へ戻る</Link></p>
    </main>
  );
}
