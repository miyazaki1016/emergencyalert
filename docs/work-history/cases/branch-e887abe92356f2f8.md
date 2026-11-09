# research/severe-rain-consistency-20261101

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** ブランチ差分（PR関連あり）

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

関連PR：[#109](https://github.com/miyazaki1016/emergencyalert/pull/109)

根拠取得日時 (UTC)：2026-11-09T09:28:48.935616+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [app/api/rain/route.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/app/api/rain/route.ts)：同一HEADのPR案件に原文収録
- [docs/DEVELOPMENT_LEDGER.md](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/docs/DEVELOPMENT_LEDGER.md)：同一HEADのPR案件に原文収録
- [docs/PROJECT_OVERVIEW.md](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/docs/PROJECT_OVERVIEW.md)：同一HEADのPR案件に原文収録
- [docs/SEVERE_RAIN_CONSISTENCY_RESEARCH_20261101.md](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/docs/SEVERE_RAIN_CONSISTENCY_RESEARCH_20261101.md)：同一HEADのPR案件に原文収録
- [docs/audits/PR109_CI_RECOVERY_20261103.md](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/docs/audits/PR109_CI_RECOVERY_20261103.md)：同一HEADのPR案件に原文収録
- [lib/research/forecastEvidence.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/lib/research/forecastEvidence.ts)：同一HEADのPR案件に原文収録
- [lib/research/forecastEvidenceBudgetGate.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/lib/research/forecastEvidenceBudgetGate.ts)：同一HEADのPR案件に原文収録
- [lib/research/forecastEvidenceCapacity.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/lib/research/forecastEvidenceCapacity.ts)：同一HEADのPR案件に原文収録
- [lib/research/forecastEvidenceFailureMonitor.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/lib/research/forecastEvidenceFailureMonitor.ts)：同一HEADのPR案件に原文収録
- [lib/research/forecastEvidenceRetention.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/lib/research/forecastEvidenceRetention.ts)：同一HEADのPR案件に原文収録
- [lib/research/forecastHistoryReplay.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/lib/research/forecastHistoryReplay.ts)：同一HEADのPR案件に原文収録
- [lib/research/severeRainConsistency.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/lib/research/severeRainConsistency.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/forecastEvidenceCompact.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/supabase/functions/_shared/forecastEvidenceCompact.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/_shared/forecastEvidencePilot.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/supabase/functions/_shared/forecastEvidencePilot.ts)：同一HEADのPR案件に原文収録
- [supabase/functions/watch-rain/index.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/supabase/functions/watch-rain/index.ts)：同一HEADのPR案件に原文収録
- [tests/forecastEvidence.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/tests/forecastEvidence.test.ts)：同一HEADのPR案件に原文収録
- [tests/forecastEvidenceBudgetGate.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/tests/forecastEvidenceBudgetGate.test.ts)：同一HEADのPR案件に原文収録
- [tests/forecastEvidenceCapacity.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/tests/forecastEvidenceCapacity.test.ts)：同一HEADのPR案件に原文収録
- [tests/forecastEvidenceCompact.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/tests/forecastEvidenceCompact.test.ts)：同一HEADのPR案件に原文収録
- [tests/forecastEvidenceFailureMonitor.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/tests/forecastEvidenceFailureMonitor.test.ts)：同一HEADのPR案件に原文収録
- [tests/forecastEvidencePilot.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/tests/forecastEvidencePilot.test.ts)：同一HEADのPR案件に原文収録
- [tests/forecastEvidenceRetention.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/tests/forecastEvidenceRetention.test.ts)：同一HEADのPR案件に原文収録
- [tests/forecastHistoryReplay.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/tests/forecastHistoryReplay.test.ts)：同一HEADのPR案件に原文収録
- [tests/replayWatchIntegration.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/tests/replayWatchIntegration.test.ts)：同一HEADのPR案件に原文収録
- [tests/severeRainConsistency.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/tests/severeRainConsistency.test.ts)：同一HEADのPR案件に原文収録

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| 実行証拠未取得 | 未確認 | — |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text

```

## ソース・テスト・資料の抜粋（実行はしない）

