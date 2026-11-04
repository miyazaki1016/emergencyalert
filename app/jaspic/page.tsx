import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "JASPIC Mail Automation | サービス概要",
  description: "警察が公開する情報の確認と、指定された受信先へのメール連絡を補助する個人利用のツールについて。",
  alternates: { canonical: "https://emergencyalert.news/jaspic" },
};

const panel = { maxWidth: 740, margin: "52px auto", padding: "32px 26px", background: "#fff", borderRadius: 16, color: "#162436", lineHeight: 1.8, boxShadow: "0 8px 30px rgba(0,0,0,.14)" } as const;

export default function JaspicOverviewPage() {
  return (
    <main style={panel}>
      <p style={{ fontSize: 13, color: "#476280", margin: 0 }}>EmergencyAlert / 個人利用ツールの案内</p>
      <h1 style={{ fontSize: 30, lineHeight: 1.4, marginTop: 12 }}>JASPIC Mail Automation</h1>
      <p>JASPIC Mail Automationは、広島県警・滋賀県警が公開する防犯関連情報を確認し、指定された受信先へのメール連絡を補助するための、運営者本人専用のシステムです。</p>
      <h2 style={{ fontSize: 20, marginTop: 30 }}>利用目的</h2>
      <p>公開情報の取得、前回取得分との差分確認、必要な通知文面の生成を行います。Google Gmail APIの送信権限は、運営者が管理するGmailアカウントから所定の相手へ通知メールを送信する目的のみに使用する予定です。</p>
      <h2 style={{ fontSize: 20, marginTop: 30 }}>利用対象と現況</h2>
      <p>不特定多数に提供するサービスではなく、個人管理用です。メール送信機能は現在準備・検証中であり、このページを公開することによって送信が開始されることはありません。</p>
      <h2 style={{ fontSize: 20, marginTop: 30 }}>公式機関との関係</h2>
      <p>本ツールは各警察機関やGoogleの公式サービスではなく、これらの組織による承認・保証を示すものではありません。</p>
      <h2 style={{ fontSize: 20, marginTop: 30 }}>プライバシーについて</h2>
      <p>Googleアカウントへのアクセス権限と情報の取り扱いについては、<Link href="/jaspic/privacy">プライバシーポリシー</Link>をご覧ください。</p>
      <hr style={{ border: 0, borderTop: "1px solid #dce3ea", margin: "32px 0 20px" }} />
      <p style={{ fontSize: 14 }}>本ページは <a href="https://emergencyalert.news">emergencyalert.news</a> に設置した、個人運営のツール案内です。</p>
    </main>
  );
}
