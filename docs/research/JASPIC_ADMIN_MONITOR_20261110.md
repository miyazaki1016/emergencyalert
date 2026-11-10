# JASPIC 管理者通知・引継ぎ記録

## 着手前照合と再利用判断

2026-11-10、依頼全文で `scripts/development_preflight.py` を実行。履歴版 `35e99c03cc17b771c8bfd3145d751fb676ba57be`、結果 `NO_STRONG_MATCH`。語句の順位は雨通知系を上位に出したため、候補なしを新規性の保証にせずJASPIC原本も確認した。

[PR #155](https://github.com/miyazaki1016/emergencyalert/pull/155) の保存済み原本、main の OAuth保存、dispatch、production-plan、production-gmail、専用テストを確認。判断は `extend`。暗号化・管理者認可・再認証ページ・送信済み識別・差分制限をそのまま再利用し、運用通知と失敗箇所の記録だけを追加。旧MIME互換研究や実防犯メールの送信試験は繰り返さない。

本番DBでは `jaspic-production-1800-jst` は有効、UTC 09:00（JST18:00）。11月9日18:00に `HISTORICAL_ID_REQUIRES_RECONCILIATION`。その後11月10日06:02 JSTの成功記録で広島9件・滋賀0件。履歴修復・再送は今回の対象外。

## 通知経路

Google OAuthとVercelから独立したSupabase pg_cron / pg_netから外部メールAPIへ送る。外部サービス候補はResend（24時間のidempotency保証があり、不明応答の再試行を重複させないため）。本番環境変数・Vaultに外部メール設定は存在しなかった。通知先・差出人・サービスは利用者確認後に設定する。設定前は監視送信を無効にし、防犯情報の既存18時ジョブは変更しない。

認証完了は暗号化更新トークンの保存トランザクションで記録。テストモード7日を管理上の期限とし、約24時間前（5分間隔）から一度通知。既存資格情報のみ `updated_at` からの推定で、Googleが保証した正確な失効時刻ではない。通常のaccess token refreshで期限を延ばさない。

監視自体と同じSupabase全体が停止した場合は、その停止中にメールを出せない。メールAPIの受付成功は受信箱への到達保証ではない。実受信の確認が別途必要。

## 検証と再開手順

- Vitest全体52ファイル338テスト、TypeScript、ローカルNext.js buildが成功。
- 専用SQL統合検証をPGlite/PostgreSQLで実行。認証日時更新・通常更新時の期限維持・再認証後の旧通知取消・24h境界・期限経過・両県失敗・未起動・認証/送信/一部失敗・中断・重複排除・API不明応答・同一本文/キーのretry・最大3回・23h打切り・日12件上限・非公開権限を確認。ネットワークはfake pg_netで無送信。
- 実PostgreSQL17での同じ検証は専用GitHub Actionsで実施。実外部メールAPIの受付/受信試験とは区別する。
- 実ページ `https://emergencyalert.news/jaspic/oauth` のGmail認証・再認証案内・ログインフォームをHTTP GETで確認。新たなGoogle認証操作は管理者本人が行う。

設定は `jaspic_monitor.config` のrecipient/sender、Vault名 `jaspic_monitor_resend_api_key`。秘密値はチャット・ログ・Gitへ書かない。管理者アカウントはauth.usersのjaspic_role=adminで照合済み。外部サービス・差出人・通知先の確認後、運用者向けテスト通知だけをenqueueして有効化し、API受付・実受信を確認する。防犯dispatchはテスト起動しない。

本番適用時はSupabase migrationで `docs/sql/jaspic-admin-monitor.sql` を一度適用する。既存ジョブを止めない。監視メール無効のままでも、トークン更新時の期限記録は稼働する。監視自身がSupabase停止中に検知できない制約を残す。
