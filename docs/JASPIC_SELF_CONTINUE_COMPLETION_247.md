# Issue #247 — JASPIC 自動継続・完了通知の実装チェックポイント

> 2026-11-16。実装前の安全設計。**本番反映・DB変更・メール実送信は未実施。** 既存の送信台帳・OAuthを再利用する。

## 確認済みの現状（main）

- `app/jaspic/dispatch/route.ts` は `jaspic_begin_run` の排他を取得し、`SENDING/UNKNOWN/FAILED` があれば停止、`PREPARED` があれば `jaspic_resume_prepared` で再開する。送信は `selectDispatchBatch` により最大20件。最後に `remainingPrepared` を記録して `SUCCEEDED` を返すが、**次の実行を自ら起動しない**。
- 既存の `jaspic_monitor.scan_completions()` は残キューを見て `pg_net` で `/jaspic/dispatch` を再起動する。5分監視cronを停止すると、この継続経路が使えない。
- 既存の正常完了メールは `jaspic_monitor.completion_tick()` 側で生成・送信する。したがって、**次バッチだけを自己起動しても、停止中の5分cronに依存する完了メールは届かない**。配信と通知の両方を移行する必要がある。
- `app/jaspic/dispatch/route.ts` はGmail refresh tokenを復号し、Google OAuth token endpointで更新してから送信する。認証チェックで追加の本番トークン更新を無断実行しない。
- 既存 `jaspic_monitor` の認証期限はGoogleの実際の有効期限保証ではなく、testing modeの7日推定を含む。メールには「推定」「確認不能」を区別して記載する。

## 実装方針と必須条件

1. **継続起動の永続性**：レスポンス送信後の `fetch` や `setTimeout` に依存しない。Supabaseの耐久キュー／単発ジョブを用い、完了したバッチの `remainingPrepared>0` だけ次バッチを登録する。登録の失敗を成功扱いしない。既存の監視を24時間再有効化しない。
2. **排他・冪等**：`jaspic_begin_run`、`jaspic_claim`、`jaspic_finish_production` と `SENDING/UNKNOWN/FAILED` 停止条件を維持。二重トリガーでも同じ `province/record_key/version` を再送しない。キュー内全候補を保存した後だけスナップショット更新する。
3. **全件完了の確定**：`remainingPrepared=0` だけでなく、同一対象日の未解決配送や失敗を確認し、正常終了時だけ日付キーで完了メールを1通生成する。途中バッチの `SUCCEEDED` を「全件完了」と誤認しない。0件の日も通知する。
4. **完了メール**：既存のResend通知・送信回数制限・重複排除を再利用。広島/滋賀の実送信合計、保留件数、最終処理日時を全バッチ集計で記載する。OAuth状態は `正常（実際の更新成功確認時）`／`要再認証`／`確認不能` と区別し、推定期限はその旨を表示する。再認証URLは既存の `https://emergencyalert.news/jaspic/oauth` を使う。トークン・シークレットを含めない。
5. **障害時**：認証チェック失敗で完了メール生成を妨げない。メール通知失敗は送信台帳と分離し、既存の再試行・idempotency keyを維持。配信処理の失敗やネットワーク結果不明では自動再送しない。
6. **検証**：0/20/21/34/50/100件、県混在、バッチ起動重複、再開途中停止、Gmail応答不明、認証切れ、通知API失敗、完了通知の重複を無送信テスト。DB migrationを必要とする場合はロールバックと権限・cron設定差分を明記し、別途本番変更許可を得る。

## 既存成果照合

- Issue #247 の着手前照合：REVIEW_RECORDED、[Actions #43804944995](https://github.com/miyazaki1016/emergencyalert/actions/runs/43804944995)
- 分割送信：[#235](https://github.com/miyazaki1016/emergencyalert/issues/235)、[#238](https://github.com/miyazaki1016/emergencyalert/issues/238)、[PR #236](https://github.com/miyazaki1016/emergencyalert/pull/236)、[PR #240](https://github.com/miyazaki1016/emergencyalert/pull/240)
- 既存完了通知・認証監視：[PR #193](https://github.com/miyazaki1016/emergencyalert/pull/193)、`docs/research/JASPIC_COMPLETION_NOTIFICATION_20261110.md`、`docs/sql/jaspic-admin-monitor.sql`
- OAuth研究：[PR #155](https://github.com/miyazaki1016/emergencyalert/pull/155)

## 現時点の残課題

**実装未着手**。次はSupabaseの耐久起動経路・既存SQL権限の整合を検証し、dispatchと通知の変更、テスト、CIを行う。完了メールを5分cronに依存させたままでは受入不可。
