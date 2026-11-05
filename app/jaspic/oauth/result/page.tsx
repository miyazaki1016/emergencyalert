import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "JASPIC Gmail認証結果",
  robots: { index: false, follow: false },
};
export default async function JaspicOauthResult({ searchParams }: {
  searchParams: Promise<{status?: string}>;
}) {
  const {status} = await searchParams;
  const ok = status === "ok";
  return (
    <main style={{maxWidth:700,margin:"54px auto",padding:28,background:"#fff",borderRadius:16,color:"#162436",lineHeight:1.9}}>
      <h1>JASPIC Gmail認証</h1>
      <p aria-live="polite">{ok
        ? "Googleの送信権限を確認し、認証情報を安全に保管しました。"
        : "認証は完了していません。管理者設定をご確認ください。"}</p>
      <p>Gmailからの実メール送信と18時の自動配信は、引き続き開始していません。</p>
      <p><Link href="/jaspic/oauth">認証ページに戻る</Link></p>
    </main>
  );
}
