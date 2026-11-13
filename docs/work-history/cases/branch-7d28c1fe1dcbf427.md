# feat/national-rain-1mm-dry-run-216

**目的：** 未確認

**実装状態：** mainとの差分を収録。差分ゼロも記録

**検証の扱い：** 未確認

**PR状態：** ブランチ差分（PR関連あり）

**main統合：** 未確認

**本番反映：** 未確認

**残課題：** 未確認

**次の作業：** 関連PR・mainとの同等実装を照合。ブランチの存在だけで未完成扱いしない

関連PR：[#217](https://github.com/miyazaki1016/emergencyalert/pull/217)

根拠取得日時 (UTC)：2026-11-13T03:12:14.705435+00:00


## 実際の変更処理（コードから抽出）

差分・ソースを参照

- [.github/workflows/jma-light-rain-proof.yml](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/.github/workflows/jma-light-rain-proof.yml)：同一HEADのPR案件に原文収録
- [.github/workflows/light-rain-bluesky-issue-219.yml](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/.github/workflows/light-rain-bluesky-issue-219.yml)：同一HEADのPR案件に原文収録
- [.github/workflows/light-rain-nationwide-n03-acquisition.yml](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/.github/workflows/light-rain-nationwide-n03-acquisition.yml)：同一HEADのPR案件に原文収録
- [.github/workflows/light-rain-official-n03-proof.yml](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/.github/workflows/light-rain-official-n03-proof.yml)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainAdministrativeAreas.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainAdministrativeAreas.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainBlueskyDelivery.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainBlueskyDelivery.test.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainBlueskyDelivery.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainBlueskyDelivery.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainMunicipalities.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainMunicipalities.test.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainMunicipalities.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainMunicipalities.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainN03LocalProof.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainN03LocalProof.test.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainN03LocalProof.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainN03LocalProof.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainNationwideN03.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainNationwideN03.test.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainNationwideN03.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainNationwideN03.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainOfficialN03.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainOfficialN03.test.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainOfficialN03.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainOfficialN03.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainProof.live.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainProof.live.test.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainProof.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainProof.test.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/lightRainProof.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/lightRainProof.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/nationalForecastBluesky.test.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/nationalForecastBluesky.test.ts)：同一HEADのPR案件に原文収録
- [lib/weather/rain/nationalForecastBluesky.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/lib/weather/rain/nationalForecastBluesky.ts)：同一HEADのPR案件に原文収録
- [scripts/light-rain-bluesky-dry-run.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/scripts/light-rain-bluesky-dry-run.ts)：同一HEADのPR案件に原文収録
- [scripts/light-rain-jma-n03-live-proof.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/scripts/light-rain-jma-n03-live-proof.ts)：同一HEADのPR案件に原文収録
- [scripts/light-rain-nationwide-live.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/scripts/light-rain-nationwide-live.ts)：同一HEADのPR案件に原文収録
- [scripts/light-rain-nationwide-n03-audit.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/scripts/light-rain-nationwide-n03-audit.ts)：同一HEADのPR案件に原文収録
- [scripts/light-rain-official-n03-proof.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/scripts/light-rain-official-n03-proof.ts)：同一HEADのPR案件に原文収録
- [scripts/light-rain-prepare-official-n03.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/scripts/light-rain-prepare-official-n03.ts)：同一HEADのPR案件に原文収録
- [scripts/light-rain-z10-refine.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/scripts/light-rain-z10-refine.ts)：同一HEADのPR案件に原文収録
- [scripts/national-light-rain-jma-proof.ts](https://github.com/miyazaki1016/emergencyalert/blob/d86ff1dc3cd15c1730e9ea474fcb900066674034/scripts/national-light-rain-jma-proof.ts)：同一HEADのPR案件に原文収録

## 検証実行の事実

| ワークフロー | 結果 | 対象SHA |
| --- | --- | --- |
| 実行証拠未取得 | 未確認 | — |

## 当時の説明・結論（原文。作者の主張と実測を区別）

```text

```

## ソース・テスト・資料の抜粋（実行はしない）

