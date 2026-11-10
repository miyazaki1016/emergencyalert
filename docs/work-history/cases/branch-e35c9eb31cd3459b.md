# feat/notification-replay-production-20261029

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** ブランチ差分（PR関連あり）

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

関連PR：[#99](https://github.com/miyazaki1016/emergencyalert/pull/99)

根拠取得日時 (UTC)：2026-11-10T05:33:58.199176+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [.github/workflows/ci.yml](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/.github/workflows/ci.yml)：同一HEADのPR案件に原文収録
- [docs/NOTIFICATION_REPLAY_PRODUCTION_20261029.md](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/docs/NOTIFICATION_REPLAY_PRODUCTION_20261029.md)：同一HEADのPR案件に原文収録
- [docs/PROJECT_OVERVIEW.md](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/docs/PROJECT_OVERVIEW.md)：同一HEADのPR案件に原文収録
- [docs/sql/rain-replay-monitoring.sql](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/docs/sql/rain-replay-monitoring.sql)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/rainReplay.ts](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/supabase/functions/_shared/rainReplay.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/replayJma.ts](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/supabase/functions/_shared/replayJma.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/replayRecording.ts](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/supabase/functions/_shared/replayRecording.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/evaluate-rain/index.ts](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/supabase/functions/evaluate-rain/index.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/watch-rain/index.ts](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/supabase/functions/watch-rain/index.ts)：同一HEADのPR案件に原文収録
- [supabase/migrations/20261029021418_notification_radar_replay.sql](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/supabase/migrations/20261029021418_notification_radar_replay.sql)：同一HEADのPR案件に原文収録
- [supabase/migrations/20261029022421_notification_radar_replay_schedule.sql](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/supabase/migrations/20261029022421_notification_radar_replay_schedule.sql)：同一HEADのPR案件に原文収録
- [tests/rainReplay.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/tests/rainReplay.test.ts)：同一HEADのPR案件に原文収録
- [tests/replayJma.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/tests/replayJma.test.ts)：同一HEADのPR案件に原文収録
- [tests/replayWatchIntegration.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/tests/replayWatchIntegration.test.ts)：同一HEADのPR案件に原文収録
- [tests/sql/rain-replay-integration.sql](https://github.com/miyazaki1016/emergencyalert/blob/626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8/tests/sql/rain-replay-integration.sql)：同一HEADのPR案件に原文収録

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| 実行証拠未取得 | 未確認 | — |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text

```

## ソース・テスト・資料の抜粋（実行はしない）

