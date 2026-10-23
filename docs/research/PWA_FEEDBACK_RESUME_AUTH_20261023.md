# PWA復帰時の通知履歴消失と匿名認証の調査（2026-10-23）

状態: **静的コード監査済み／実機原因未確定／本番変更なし**。

## 実機観測（ユーザー報告）
- ホーム画面PWA: 起動直後は「🌧️ 届いた通知の天気を教えてね」がある。初回バックグラウンド復帰で黒画面が一瞬出て、履歴セクション全体が消える。以後の復帰は黒画面なし、セクションも消えたまま。完全終了→再起動で戻る。
- Safari: 復帰ごとに白画面が一瞬出るが、履歴セクションは維持。
- Chrome: 「この通知を受け取った端末・アカウントで開いてね。」と表示。復帰時の画面変化は見えない。
- 認証ID変化と履歴セクション消失の時系列は一致しない。別問題として追う。

## コードで確認した事実（main 2026-10-23）
1. `app/page.tsx`: `<NotificationFeedbackHistory />` は条件分岐なしで描画。親の `visibilitychange` は最新アラート取得のみ。
2. `app/components/NotificationFeedbackHistory.tsx`: `<section>` は無条件。取得失敗やsession nullでも枠は残る設計。セッションなしメッセージは `auth.getSession()` の戻り `session === null` でのみ設定される（認証例外は別メッセージ）。
3. 同コンポーネントの `refresh` は mount、`visibilitychange` visible、5分間隔、`amefuru:auth-ready`、`SIGNED_IN/OUT` で呼ばれる。`refresh` は `ownerId` に依存し、`ownerId` 更新でeffect再登録＋追加refreshを起こす。
4. `lib/supabase/browser.ts` は呼び出すたび `createClient` を実行。複数インスタンスとauthリスナー／並行refreshが生じうる。**実機不具合の原因と断定できない**。
5. `app/layout.tsx` に履歴だけを条件付きで隠す処理なし。
6. `public/sw.js` はskipWaiting/clients.claimを使うが、通常のvisibilitychangeでreloadを直接要求する処理は見つかっていない。

## 暫定評価
- 単なるsession nullや履歴0件では**セクション全体の消失は説明できない**。古いdocumentへの遷移、WebKitの復元、Reactレンダー/例外、異なるビルドの読み込み等の切り分けが必要。
- Safariの白フラッシュとPWAの黒フラッシュはreloadの証拠ではない。
- Chromeのsession nullはChromeのストレージ状態を示すだけで、PWAのセッション喪失を証明しない。
- 複数refreshとSupabase client再生成は改善候補だが、原因の実証前に本番変更しない。

## 次の安全な調査
1. 読み取り専用で、PWA復帰前後のdocument navigation、JS error、build ID、component mount/unmount、auth session有無を匿名IDそのものを記録せず検出する診断案を設計。
2. 別ブランチで最小の計測パッチと再現手順を作る。ログにtokenや完全IDを含めない。
3. 必要ならSafari Web Inspectorを使った実機再現を依頼。PWA削除・サイトデータ消去・signOutは避ける。
4. 計測結果で原因が絞れた後に修正を提案し、明示承認まで本番反映しない。

## 運用
研究ブランチ: `research/pwa-feedback-resume-auth-20261023`
詳細: `docs/research/PWA_FEEDBACK_RESUME_AUTH_20261023.md`
main総覧 `docs/PROJECT_OVERVIEW.md` の索引追記は、mainへのpushが本番デプロイを発火させうるため、現時点では保留。次の承認済みdocs-only更新時に必ず索引化。
