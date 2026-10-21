# MYアメふる — 段階公開ゲート（2026-10-20）

**現在の状態：NO-GO（未公開）**。この文書は操作手順と検証条件。SQLの適用、Edge Functionのデプロイ、Mainマージ、通知条件の変更を**このPRだけで自動実行しない**。

## 2026-10-21 重要な追加ブロッカー: Push ID先行発行

- **本番DBの現行CHECKは `notification_deliveries.delivered_count > 0`。** 読み取り専用の `pg_constraint` 照合で確認。PR #63の先行履歴作成は `delivered_count=0` をINSERTするため、**現行本番DBではINSERTが拒否されPush送信を停止する**。CI成功だけで本番デプロイしないこと。
- `docs/sql/my-rain-notification-pending.sql` をステージングで検証してから、明示承認のある本番DB段階で先に適用する。`delivered_count >= 0` へ変更し、0を**未配信**、1以上を**成功配信あり**として扱う。配信0を利用者履歴に表示・フィードバック受付しない。
- 未ログイン時は通知履歴を見せずアカウント案内を表示。匿名ログインの端末/アカウントが異なると同じPush URLでも履歴は引けない。URLのIDは認可トークンではない。
- **送信成功後のDB更新失敗**では、実際にPushが届いても `delivered_count=0` のままになる。配信成功ログ・未確定レコードの突合、再試行の重複防止、復旧手順が必要。整合性検証と異常ケース試験が済むまで**本番NO-GO**。

## 2026-10-21 配送成功後の記録失敗 — 回復と停止契約（#63）

- 送信直前に `notification_deliveries` の0件pending行を作り、そのIDをPush URLに入れる。**Pushの送信成功と、DBの確定成功は別の結果**。
- 配信成功件数が1以上のときだけ、同じ `delivered_count` の絶対値UPDATEを試みる。書込み応答には `id,delivered_count` を要求し一致を検査する。通信タイムアウト等ならDBを再読込し、既にコミット済みか照合してから、最大3回の冪等な書込みを行う。**このリトライでPushは二度送らない**。
- 確定できなかったときは `notification_delivery_unconfirmed_requires_reconciliation` をログへ出し、worker結果の `deliveryRecorded=false` と `unconfirmedDeliveryId` で監査対象を表す。見つかったIDと件数は内部ログ・権限付き運用記録でのみ扱う。これは**自動回復/再送成功の保証ではない**。
- 安全な運用調査では、運用者が（実際の送信レスポンスを証明できるログと）対象のpending行を照合する。送達結果が証明できない場合は、成功件数を**推測で上書きしない**。現場利用者へは「履歴確認中」などの説明が必要となる場合がある。
- workerが確定不能でも `watch_states.last_notified_at` を送信成功数に基づいて書き続けるため、その書込みも失敗した場合やworkerが途中で落ちた場合は、再実行で重複Pushが起きる余地が残る。**exactly-once配信・全成功の復旧保証は未達**。本番投入前に故障注入・並行実行・監視とオンコール復旧手順を検証する。
- `delivered_count=0` はユーザーの配送成功履歴・フィードバックの対象外。RLSの所有者照合だけでなく、回答POLICYで成功件数1以上を必須にする。失効した匿名セッションでの履歴未表示も正常な権限制御であり、同じPush IDを別アカウントへ開放しない。
- 本番DBの制約 `CHECK (delivered_count > 0)` に対する staged migration は `docs/sql/my-rain-notification-pending.sql`。順序を逆にしてEdgeを先行デプロイしてはいけない。

## 現行本番の読み取り専用確認
- Supabase project: EmergencyAlert（「美咲」の別プロジェクトは対象外）。
- 2026-10-20 確認：`public.notification_deliveries` に `decision_snapshot` は**ない**。新しい `public.rain_notification_feedback` テーブルも**ない**。
- `public.rain_diagnostic_history` は既存だが、過去の正常時の `diagnostic` はNULLのものがあり、`endingNoticeCandidate` を含む新しい履歴は未展開。過去件数から精度を主張しない。
- PRブランチの CI は変更のたびに `npm test`, `npm run build`, 使い捨て PostgreSQL による feedback RLS と evidence column のテストを実行する。

## 段階ごとの進行可否

### Phase A — 開発・ステージングで確認（本番は無変更）
1. 最新コミットの **CI全ジョブ緑**。失敗・実行待ちなら停止。
2. 使い捨て PostgreSQLで `docs/sql/my-rain-notification-evidence.sql`、`docs/sql/my-rain-notification-feedback.sql`、`docs/sql/my-rain-notification-pending.sql` の再適用可否と既存通知の非破壊性を確認。
3. 隔離されたSupabase検証環境で、ログイン済み利用者A/Bの通知履歴読み取り、回答の新規保存／変更、他人の通知へのアクセス拒否、サインアウトを**実際のHTTPセッション**で確認。Postgresの `SET ROLE` テストだけでは完全な代わりにならない。
4. iPhone Safari/PWAで、履歴表示、回答、読み込み失敗時の状態、通知をタップしたときの挙動を実機確認。
5. 既存通知文・通知時刻とシャドー判定結果を区別した試験ログを保存。**新しい終了判定をPush判定に用いない**。

### Phase B — 本番DB変更（ユーザーの明示承認が必要）
1. 本番の既存テーブル構造、RLS/GRANTと最新のバックアップ・復旧手順を照合。変更前の `notification_deliveries` 件数と直近の正常Push履歴を記録。
2. 承認後にまず **追加型の列・フィードバックテーブルと、0件保留レコードを許可するCHECK変更だけ**をDBに適用。新規テーブルはRLS有効、権限はauthenticated限定、所有者と通知種類を制約。
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

## 2026-10-21 優先順位の見直し（ユーザー指示）

現在はサービス開始時期が未定の機能開発段階。**配送失敗・DB障害時の運用セーフティーネットをこれ以上深掘りせず、通知履歴とユーザーフィードバックの機能完成を優先する。** 既存の安全上の停止条件は保つが、現時点ではoutboxの本番統合・複雑な障害復旧の実装に進まない。

今回の機能進捗は `lib/weather/rain/notificationHistory.ts` と `app/page.tsx`：通知タップ対象を一覧の先頭へ表示し、本人に「この通知」の回答場所を案内。保存済みの回答ラベル・更新可能であること・回答直後の保存確認を表示する。回帰テストは `tests/notificationHistory.test.ts`。**実機/実Supabase HTTPセッションは未検証**のまま。

次の主な機能作業：iPhoneで通知→該当履歴→回答→再表示の動線検証、未ログイン時の復帰導線、回答できる種類・時間帯のUI整理。ステージング未構築ならプレビュー上でできる検証とできない検証を区別する。
