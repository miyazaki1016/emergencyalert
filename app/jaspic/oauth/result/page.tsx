export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  return <main style={{maxWidth:640,margin:"48px auto",padding:24}}>
    <h1>Google本人確認</h1>
    <p role="status">{params.status === "send-consent-ok"
      ? "Gmail送信権限の確認テストに成功しました。認証情報は保存せず破棄しました。メールは送信していません。"
      : params.status === "send-consent-failed"
      ? "Gmail送信権限の確認を完了できませんでした。メールは送信していません。"
      : params.status === "ok"
      ? "本人確認が完了しました。メール送信は有効化されていません。"
      : "本人確認を完了できませんでした。もう一度お試しください。"}</p>
    <a href="/jaspic/oauth">管理者画面に戻る</a>
  </main>;
}
