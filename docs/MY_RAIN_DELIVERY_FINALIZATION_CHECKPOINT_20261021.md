# MYアメふる — 通知ID・配信後DB確定の安全性 checkpoint

日時: 2026-10-21 JST。対象PR #63、branch: `feat/my-rain-notification-history-20261019`。
**開発専用記録 / 本番 NO-GO。** この時点で本番Supabase/Edge/Push/cron、mainは無変更。

## 問題と原因

通知履歴IDを先に採番する方式では、配信前の `notification_deliveries` 行は `delivered_count=0` となる。本番DBの読み取り専用メタデータ照合で `notification_deliveries_delivered_count_check: CHECK(delivered_count > 0)` を確認。これに対する制約変更は `docs/sql/my-rain-notification-pending.sql` に**準備だけ**した。現行DBへは未適用。

Push受理の後にDB `delivered_count` 更新が失敗すると、ユーザーに通知が届く場合でも履歴が未配信として隠れ、検証回答ができない。通信タイムアウトでは書込みが成功したか不明な場合がある。

## 今回実装

1. `supabase/functions/watch-rain/deliveryFinalization.ts`: 送信済み件数を**絶対値UPDATE**する処理を支える再試行ヘルパー。成功応答でIDと件数を照合し、不明時はDB再読込み。最大3回の冪等再試行（Pushは再送しない）。確定不可時は明示失敗扱い。
2. `supabase/functions/watch-rain/index.ts`: `delivered>0` の時だけfinalize、結果を `deliveryRecorded` と `unconfirmedDeliveryId` に保持し、未確定は専用エラーログへ。送信成功した事実をDB記録成功と混同しない。
3. `tests/deliveryFinalization.test.ts`: 正常時、タイムアウト後の成功確認、再試行、持続失敗、0件拒否、誤った更新応答を単体テスト。
4. `docs/sql/my-rain-notification-feedback.sql`: 所有者の送達通知でも `delivered_count=0` なら回答拒否。 `tests/sql/feedback-rls-integration.sql` で検証。
5. `app/page.tsx`: 古い通知IDを直接参照し、未ログイン・他アカウントなどで表示できない場合の案内を追加済み。
6. `docs/MY_RAIN_STAGED_ROLLOUT_GATE_20261020.md`: 移行順序・リカバリ・停止条件に追補。

## 観測された検証状態と未完了

- GitHub Actionsで `f7cea304`、`9f97005c`、finalize helper/worker差分 `aea51b2b`、**新しい単体テストを追加した `7da92198`（run 39548716686）**、文書更新 `fbc409ad` がsuccess。これらは隔離CI結果であり実機/本番の保証ではない。最新HEADの結果は別途確認。
- 隔離PostgreSQLのCI RLSは、本物のSupabase HTTPセッション・iPhone Push受信/タップの代わりではない。実運用での故障注入・クラッシュ回復・重複抑制も未検証。
- `watch_states` 書込み失敗、複数workerの同時実行、通知ごと/購読ごとの冪等キー、ジョブのクラッシュ間に**exactly-once** は保証できない。配信直後の落ち方によって、次サイクルの重複通知があり得る。後続の設計レビューと検証が必要。
- DB確定に失敗した `notificationId` は自動で配信成功と復旧しない。運用者が証拠を照合し、権限/処理と復旧方法を決定する。推測で `delivered_count` を上げない。
- 新しいSQLは本番未適用。NO-GO維持。Previewは本番Supabaseを使って検証しない。美咲は今回の操作対象外。

## 次の具体操作

- 新しい単体・CI・隔離SQLテスト結果を最新HEADで検証し、成功runをここに追記。
- 故障注入で「DB write success but lost HTTP response」「write/read fail」「worker crash」「subscriptions partial failure」「concurrent worker」を分けて検証。
- 必要に応じ、通知単位のidempotency key / claim lease / outbox table等を**別設計承認**として検討。既存運用stateを無条件に初期化しない。
- 隔離Supabase検証環境を準備し、A/B本人制約、iPhone開封→回答保存、期限外リンク、サインアウト、リロードを検証後に、公開可否を再判定。
