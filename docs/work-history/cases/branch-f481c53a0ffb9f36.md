# feat/my-rain-notification-history-20261019

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** ブランチ差分（PR関連あり）

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

関連PR：[#63](https://github.com/miyazaki1016/emergencyalert/pull/63)

根拠取得日時 (UTC)：2026-11-13T03:12:14.705435+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [.github/workflows/ci.yml](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/.github/workflows/ci.yml)：同一HEADのPR案件に原文収録
- [PROJECT_OVERVIEW.md](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/PROJECT_OVERVIEW.md)：同一HEADのPR案件に原文収録
- [app/page.tsx](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/app/page.tsx)：同一HEADのPR案件に原文収録
- [docs/MY_RAIN_ASYMMETRIC_NOTIFICATION_VALIDATION_20261019.md](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/docs/MY_RAIN_ASYMMETRIC_NOTIFICATION_VALIDATION_20261019.md)：同一HEADのPR案件に原文収録
- [docs/MY_RAIN_DELIVERY_FINALIZATION_CHECKPOINT_20261021.md](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/docs/MY_RAIN_DELIVERY_FINALIZATION_CHECKPOINT_20261021.md)：同一HEADのPR案件に原文収録
- [docs/MY_RAIN_ENDING_RADAR_OFFLINE_AUDIT.md](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/docs/MY_RAIN_ENDING_RADAR_OFFLINE_AUDIT.md)：同一HEADのPR案件に原文収録
- [docs/MY_RAIN_FIELD_OBSERVATION_20261021.md](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/docs/MY_RAIN_FIELD_OBSERVATION_20261021.md)：同一HEADのPR案件に原文収録
- [docs/MY_RAIN_IPHONE_PREVIEW_CHECK_20261020.md](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/docs/MY_RAIN_IPHONE_PREVIEW_CHECK_20261020.md)：同一HEADのPR案件に原文収録
- [docs/MY_RAIN_PUSH_CRASH_CONCURRENCY_DESIGN_20261021.md](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/docs/MY_RAIN_PUSH_CRASH_CONCURRENCY_DESIGN_20261021.md)：同一HEADのPR案件に原文収録
- [docs/MY_RAIN_STAGED_ROLLOUT_GATE_20261020.md](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/docs/MY_RAIN_STAGED_ROLLOUT_GATE_20261020.md)：同一HEADのPR案件に原文収録
- [docs/sql/my-rain-notification-evidence.sql](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/docs/sql/my-rain-notification-evidence.sql)：同一HEADのPR案件に原文収録
- [docs/sql/my-rain-notification-feedback.sql](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/docs/sql/my-rain-notification-feedback.sql)：同一HEADのPR案件に原文収録
- [docs/sql/my-rain-notification-pending.sql](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/docs/sql/my-rain-notification-pending.sql)：同一HEADのPR案件に原文収録
- [docs/sql/my-rain-push-outbox-prototype.sql](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/docs/sql/my-rain-push-outbox-prototype.sql)：同一HEADのPR案件に原文収録
- [lib/weather/rain/auditEndingRadarProxy.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/lib/weather/rain/auditEndingRadarProxy.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/feedbackTiming.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/lib/weather/rain/feedbackTiming.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/notificationHistory.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/lib/weather/rain/notificationHistory.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/persistNotificationFeedback.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/lib/weather/rain/persistNotificationFeedback.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/previewCapabilities.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/lib/weather/rain/previewCapabilities.ts)：同一HEADのPR案件に原文収録
- [scripts/audit-ending-radar.mjs](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/scripts/audit-ending-radar.mjs)：同一HEADのPR案件に原文収録
- [supabase/functions/watch-rain/decisionEvidence.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/supabase/functions/watch-rain/decisionEvidence.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/watch-rain/deliveryAttemptSafety.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/supabase/functions/watch-rain/deliveryAttemptSafety.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/watch-rain/deliveryFinalization.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/supabase/functions/watch-rain/deliveryFinalization.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/watch-rain/deliverySchemaCompat.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/supabase/functions/watch-rain/deliverySchemaCompat.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/watch-rain/endingNoticeCandidate.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/supabase/functions/watch-rain/endingNoticeCandidate.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/watch-rain/endingShadow.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/supabase/functions/watch-rain/endingShadow.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/watch-rain/index.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/supabase/functions/watch-rain/index.ts)：同一HEADのPR案件に原文収録
- [tests/auditEndingRadarCli.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/auditEndingRadarCli.test.ts)：同一HEADのPR案件に原文収録
- [tests/auditEndingRadarProxy.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/auditEndingRadarProxy.test.ts)：同一HEADのPR案件に原文収録
- [tests/decisionEvidence.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/decisionEvidence.test.ts)：同一HEADのPR案件に原文収録
- [tests/deliveryAttemptSafety.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/deliveryAttemptSafety.test.ts)：同一HEADのPR案件に原文収録
- [tests/deliveryFinalization.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/deliveryFinalization.test.ts)：同一HEADのPR案件に原文収録
- [tests/deliverySchemaCompat.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/deliverySchemaCompat.test.ts)：同一HEADのPR案件に原文収録
- [tests/endingNoticeCandidate.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/endingNoticeCandidate.test.ts)：同一HEADのPR案件に原文収録
- [tests/endingShadow.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/endingShadow.test.ts)：同一HEADのPR案件に原文収録
- [tests/feedbackTiming.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/feedbackTiming.test.ts)：同一HEADのPR案件に原文収録
- [tests/fixtures/ending-radar-sample.json](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/fixtures/ending-radar-sample.json)：同一HEADのPR案件に原文収録
- [tests/notificationHistory.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/notificationHistory.test.ts)：同一HEADのPR案件に原文収録
- [tests/persistNotificationFeedback.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/persistNotificationFeedback.test.ts)：同一HEADのPR案件に原文収録
- [tests/previewCapabilities.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/previewCapabilities.test.ts)：同一HEADのPR案件に原文収録
- [tests/sql/feedback-rls-integration.sql](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/sql/feedback-rls-integration.sql)：同一HEADのPR案件に原文収録
- [tests/sql/push-claim-integration.sql](https://github.com/miyazaki1016/emergencyalert/blob/784173985f676dc7f06d7a81275750e0ad07464e/tests/sql/push-claim-integration.sql)：同一HEADのPR案件に原文収録

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| 実行証拠未取得 | 未確認 | — |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text

```

## ソース・テスト・資料の抜粋（実行はしない）

