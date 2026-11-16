# JASPIC 18時配信の自動継続と完了通知

対象は [Issue #247](https://github.com/miyazaki1016/emergencyalert/issues/247) と [Draft PR #248](https://github.com/miyazaki1016/emergencyalert/pull/248)、ブランチ `feat/jaspic-self-continue-oauth-summary-247`。2026-11-16に最新main `b4ed8c614d616c8fbd032e8961904307287c43a3` を確認。着手前照合は [Issue REVIEW_RECORDED](https://github.com/miyazaki1016/emergencyalert/actions/runs/43804944995)、[設計時点のPR NO_STRONG_MATCH](https://github.com/miyazaki1016/emergencyalert/actions/runs/43805119747)。最新コミットの検証結果はPR本文を参照。

## 配信と通知

- 既存18時ジョブが共有のdispatch認証と定時専用ヘッダーを送る。既存の排他取得後、JSTの対象日を台帳に登録して同日重複起動を防ぐ。その登録と日次の作業専用ジョブ作成は同じDBトランザクションで行う。通常の手動起動にはこのジョブを作らない。
- 作業専用ジョブは当日の配信に限って1分ごとに処理し、既存スキャナーの台帳照合と `pg_net` の起動記録を再利用する。1バッチ最大20件、応答前に次の起動をDBへ記録し、同じバッチの起動は1回。送信先・台帳の配信ID・既存のclaimと結果確定処理は従来どおり。5分監視を有効化する必要はない。
- 送信結果不明・中断・既存キューとの不整合は自動停止。タイムアウトしたHTTP起動を再発行せず、処理中のロックと未解決の配信行を維持する。古い保留キューを検出した場合は既存の回復手順で先に確認する。処理中のまま10分経過した場合は停止通知の対象とする。翌日と重複しないよう、新規の継続判定は開始から23時間まで。
- 正常終了時は、最初の実行IDにひも付く全配信行を集計し、日付キーで既存の完了メールを1通作る。広島・滋賀の送信件数、送信合計、送信前の計画で隔離した保留の県別件数と合計を掲載する。送信結果不明や未処理のキュー行がある場合は停止通知とする。
- 最終バッチ時に既存のGmail認証更新で確認した状態を掲載する。更新成功は「正常」、Googleの `invalid_grant` または認証未登録は「要再認証」、一時障害や読取不能は「確認不能」。既存の再認証ページを掲載し、トークンやGoogleの応答本文を記録しない。0件の日は認証を確認できない場合も完了通知を作れる。送信が必要な日に認証できなければ安全停止する。
- 管理者メールは既存のResendキュー、1日12種類の上限、最大3回、固定の本文・冪等キーを再利用する。通知失敗は防犯メールの再送を起こさない。通知が終端状態になるか1時間たつと作業専用ジョブを削除する。通常の5分監視ジョブは別に管理する。

## 無送信検証

`tests/jaspic/dispatch-monitor.test.ts` は、配信先・Google・Supabaseのスタブで認証、重複起動と中断を確認する。`tests/sql/jaspic-monitor-integration.sql` は既存監視を含め、0・20・34・50・100件、県別集計・保留・完了通知1通、未確定の停止、Resend 503後の再試行を偽の `pg_net` と `pg_cron` で検証する。一次証拠は [PRの差分](https://github.com/miyazaki1016/emergencyalert/pull/248/files) と [PRのChecks](https://github.com/miyazaki1016/emergencyalert/pull/248/checks)。

## 引き継ぎと本番切替

本番切替には別途承認が必要。現行18時ジョブのコマンド、所有者、有効状態を控えてから、既存のバッチ完了SQLと同じ所有者で `psql -v ON_ERROR_STOP=1 -f docs/sql/jaspic-self-continue.sql` を適用する。これは関数とトリガーを定義する。依存SQLは `psql` の相対インクルードで読み込む。次に新しいdispatchを反映し、既存18時ジョブのコマンドを `select jaspic_monitor.dispatch_scheduled_1800();` に切り替える。ジョブ名と18時のスケジュールを引き継ぐ。本番のジョブ所有者が定時関数を実行できること、既存Vault設定、5分ジョブが停止中であることを確認してから切り替える。

戻す場合は、稼働中の配信・通知キューを確認し、18時ジョブのコマンドを記録済みの元の値へ戻す。処理中の配信を別ルートから再開する前に、台帳と保留・結果不明の行を確認する。不要な `jaspic-delivery-<初回実行ID>` の削除や登録トリガーの撤去は、既存キューの処理状況を確認してから行う。

再利用の根拠は [PR #236](https://github.com/miyazaki1016/emergencyalert/pull/236)、[PR #240](https://github.com/miyazaki1016/emergencyalert/pull/240)、[PR #241](https://github.com/miyazaki1016/emergencyalert/pull/241)、[PR #193](https://github.com/miyazaki1016/emergencyalert/pull/193)、[PR #155](https://github.com/miyazaki1016/emergencyalert/pull/155)。
