# MYアメふる — 段階公開ゲート（2026-10-20）

**現在の状態：NO-GO（未公開）**。この文書は操作手順と検証条件。SQLの適用、Edge Functionのデプロイ、Mainマージ、通知条件の変更を**このPRだけで自動実行しない**。

## 現行本番の読み取り専用確認
- Supabase project: EmergencyAlert（「美咲」の別プロジェクトは対象外）。
- 2026-10-20 確認：`public.notification_deliveries` に `decision_snapshot` は**ない**。新しい `public.rain_notification_feedback` テーブルも**ない**。
- `public.rain_diagnostic_history` は既存だが、過去の正常時の `diagnostic` はNULLのものがあり、`endingNoticeCandidate` を含む新しい履歴は未展開。過去件数から精度を主張しない。
- PRブランチの CI は変更のたびに `npm test`, `npm run build`, 使い捨て PostgreSQL による feedback RLS と evidence column のテストを実行する。

## 段階ごとの進行可否

### Phase A — 開発・ステージングで確認（本番は無変更）
1. 最新コミットの **CI全ジョブ緑**。失敗・実行待ちなら停止。
2. 使い捨て PostgreSQLで `docs/sql/my-rain-notification-evidence.sql` と `docs/sql/my-rain-notification-feedback.sql` の再適用可否と既存通知の非破壊性を確認。
3. 隔離されたSupabase検証環境で、ログイン済み利用者A/Bの通知履歴読み取り、回答の新規保存／変更、他人の通知へのアクセス拒否、サインアウトを**実際のHTTPセッション**で確認。Postgresの `SET ROLE` テストだけでは完全な代わりにならない。
4. iPhone Safari/PWAで、履歴表示、回答、読み込み失敗時の状態、通知をタップしたときの挙動を実機確認。
5. 既存通知文・通知時刻とシャドー判定結果を区別した試験ログを保存。**新しい終了判定をPush判定に用いない**。

### Phase B — 本番DB変更（ユーザーの明示承認が必要）
1. 本番の既存テーブル構造、RLS/GRANTと最新のバックアップ・復旧手順を照合。変更前の `notification_deliveries` 件数と直近の正常Push履歴を記録。
2. 承認後にまず **追加型の列・フィードバックテーブルだけ**をDBに適用。新規テーブルはRLS有効、権限はauthenticated限定、所有者と通知種類を制約。
3. schema cache/API露出の反映後、上記検証環境と同じ「A/Bユーザーの権限試験」を本番の安全なテストユーザーで確認。不要な本番ユーザーレコードは作成しない。

### Phase C — 診断ログのみ先行（別途明示承認）
1. workerのPush判断・通知文に変更がない差分であることをPR上でレビュー。APIのJMAフレームが各地点で取得できることを確認。
2. watch-rain更新後、`rain_diagnostic_history.diagnostic.endingNoticeCandidate` と `endingShadow.windows` の記録が**新しい行**に含まれるかを確認。前後の保存エラーを監視。
3. `notification_deliveries` の追加記録・`decision_snapshot` 保存・既存Push件数に異常がないか確認。正常なら少なくとも24〜72時間、異なる降雨状態で蓄積。**まだ通知条件は切り替えない**。
4. 異常時はworkerを直前のバージョンに復帰。追加したデータ列・テーブルは慌ててDROPせず保全して調査（データ損失を避ける）。
5. オフライン検証で観測有効時刻の欠損率、地点ごとのエピソード件数、10/15/30分先の再降雨予報、5分対10分の観測代替指標を報告。現地ユーザー報告とレーダー観測は別扱い。

### Phase D — 通知ロジック変更（後日、追加承認が必要）
- 早い「降りそう」と慎重な「止みそう」をそれぞれ独立評価。
- 5〜10分前の「止みそう」、短時間で降り直す「いったん止みそう」は**まだ候補**。最低必要サンプル数・許容誤報率をデータ確認後に定める。
- Shadow vs. 現行Pushの成績・現地フィードバックを比較するまで通知の発火条件や文言を変更しない。

## 明示的な停止条件
- CI赤 / データ欠損・観測時刻不明 / 実ユーザーのRLS試験未完 / 現地検証なし / Push回数の異常 / 本番承認なし。
- 本番へのSQL自動適用、Supabase Edgeの自動デプロイ、Mainの自動マージを禁止する。
