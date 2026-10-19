# MYアメふる — iPhone実機確認の準備とプレビュー接続チェック（2026-10-20）

## 自動確認できたこと
- PR #63 のコミット `5fcc798` は GitHub CI のテスト・ビルド・PostgreSQLのRLS確認に成功。
- Vercelのブランチ `feat/my-rain-notification-history-20261019` に対し、直近のプレビューDeploy `dpl_CtS2sLDLJSwvA3P3QeaQQWPwNtYV` が **READY**。プレビューURL: `https://emergencyalert-1ilf1034d-kishibojim.vercel.app`（コミット `5fcc798` 時点）。
- Vercelのプロジェクト設定で `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`NEXT_PUBLIC_VAPID_PUBLIC_KEY` の3件が **production向けのみ**の登録だった。**Previewに必要なSupabase接続設定はない**と読み取れる。Previewの画面表示が成功しても、ユーザー認証・通知履歴の読み書きが試験できたことにはならない。
- Previewから本番Supabaseを再利用して試験することは避ける。**美咲など別プロジェクトを代用しない**。隔離した検証プロジェクト/検証アカウントの準備は別途決定する。

## iPhoneで先に実施できる非破壊チェック
1. Safariからブランチの最新READYプレビューを開く。Vercelのログインを求められた場合は、通常の自分のVercelアカウントでアクセスする（回避設定や秘密のバイパスURLを作らない）。
2. モバイル幅でレイアウト、地図表示、スクロール、現在地ボタンの見え方を観察する。**位置情報共有は必須ではない**。
3. 接続設定がない場合、アプリ内に「接続設定がまだない」という注意が表示されることを確認する。
4. 接続先を確認できるまで、見張り場所の新規保存・Push許可・フィードバック送信・匿名ログイン検証は行わない。
5. エラーが出たら時刻・表示内容・ブラウザ名だけを記録する。APIキー、セッショントークン、個人住所、Push endpointを公開チャットやGitHub Issueに貼らない。

## 隔離済みステージングが準備できてから行うチェック
1. ステージングDBだけに `docs/sql/my-rain-notification-evidence.sql` と `docs/sql/my-rain-notification-feedback.sql` を適用し、新しいRLSを確認する。
2. ステージング側で2人のテスト利用者を用意し、本人の回答作成・変更・再表示、他人の通知へのアクセス拒否、ログアウト後の履歴クリアを確認する。
3. iPhone Safariで一連の表示・入力、必要に応じPWAの追加・再起動を検証する（Pushは専用の隔離環境を用意するまで送らない）。
4. 成功条件を満たすまで、**本番Supabase・Main・本番通知Workerは無変更**とする。

## 残る条件
- 実SupabaseのHTTPセッション経由の権限確認：未実施。
- iPhone Safari/PWAでの実操作：未実施。
- 実気象データによる通知精度の検証：新診断データ未蓄積につき未実施。

最新ブランチは新コミットにより自動デプロイが発生するため、検証前に最新READY URLとコミット SHA を照合すること。
