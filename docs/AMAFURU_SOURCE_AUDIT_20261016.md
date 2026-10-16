# アメふる全ブランチ発掘台帳 — 調査中（2026-10-16）

> **重要：これは全ソース読了報告ではない。** 62ブランチ・61PRの存在を確認し、ブランチ差分の一次調査を実施。各ファイルの内容・全テスト・本番状態の精査は継続中。main、本番、PRを勝手にマージ・デプロイしない。

## 調査基準

- 正本: `main` の実装と `docs/PROJECT_OVERVIEW.md`。ただし本番稼働はGitHubだけでは証明できない。
- `ahead_by=0` は「mainから見た独自コミットがない」の意味であり、デプロイ済みの証明ではない。
- `ahead_by>0` の古いブランチも、後続PRで同等実装が取り込まれている可能性がある。独自コミットの存在だけで「未実装」とは断定しない。
- ソース、テスト、実測、設計文書、CI結果、本番確認を別の証拠として扱う。

## 重要な作業系統

| ブランチ / PR | mainとの差分の一次確認 | 現状と注意 |
|---|---|---|
| `feat/national-heavy-rain-preview` / [#59](https://github.com/miyazaki1016/emergencyalert/pull/59) | 533 commits ahead、4 behind（調査時点）。全国雨雲解析・N03・キュー・Worker・多数の検証スクリプト・SQL | **Proof-only / Production未承認**。Worker routeにN03ローダー接続コードあり。ただし本番適用・性能保証とは別。 |
| `feat/live-japan-experience-prototype` / [#61](https://github.com/miyazaki1016/emergencyalert/pull/61) | 31 ahead、0 behind。 `app/live-japan/`、`app/my/page.tsx` | UI・イベントモデル試作。公式地震データ取得・本番通知は未実装。 |
| `docs/misaki-weather-integration-20261016` / [#60](https://github.com/miyazaki1016/emergencyalert/pull/60) | 2 ahead、0 behind | アメふる提供・美咲利用のDraft契約。read-only API未実装。 |
| `codex/verify-jma-png-palette-20260923` | 2 ahead、155 behind。PNG原本・SVG・manifest・色判定テスト | **要発掘**。実画像・パレット根拠が残る。後続mainとの差分と要照合。 |
| `test-jma-early-live-smoke` / [#25](https://github.com/miyazaki1016/emergencyalert/pull/25) | 9 ahead、80 behind | JMA早期降雨タイルのCI実データ検証系。現在のJMA仕様と再照合。 |
| `feat/rain-radar-layer` / [#56](https://github.com/miyazaki1016/emergencyalert/pull/56) | 4 ahead、7 behind | 地図レーダー表示。mainに同等実装があるか検証。 |
| `feat/visual-map-picker` / [#55](https://github.com/miyazaki1016/emergencyalert/pull/55) | 8 ahead、9 behind | 座標選択UI。mainとの機能比較が必要。 |
| `fix/rain-ending-hysteresis` / [#57](https://github.com/miyazaki1016/emergencyalert/pull/57) | 4 ahead、5 behind | 雨の終了通知のヒステリシス。watch-rain実装と照合。 |
| `fix/rain-ending-after-confirmed-rain` / [#58](https://github.com/miyazaki1016/emergencyalert/pull/58) | 1 ahead、7 behind | 降雨確定後の終了通知。上記とmainを照合。 |

## 差分ゼロを確認した作業ブランチ（調査時点）

`design/lighter-blue-result-order`, `design/lighter-rain-blue`, `design/polished-mobile-ui`, `design/restore-visual-contrast`, `design/white-secondary-text`, `docs/update-project-overview-20260928`, `feat/confirmed-rain-facts`, `feat/map-location-picker`, `feat/rain-returning-copy`, `feat/severe-rain-alerts`, `fix/disambiguate-duplicate-notification-labels`, `fix/internal-rain-confirmation-state`, `fix/jma-20-30-palette`, `fix/keep-rain-check-together`, `fix/natural-rain-notifications`, `fix/refresh-alerts-at-tokyo-midnight`, `fix/restore-push-status-on-load`, `fix/restore-rain-ending-decision`, `fix/suppress-rain-confirmed-push`。

## 設計資料で確認できた境界

- [LIVE JAPAN実データ接続設計](https://github.com/miyazaki1016/emergencyalert/blob/feat/live-japan-experience-prototype/docs/LIVE_JAPAN_REAL_DATA_INTEGRATION_PLAN.md): 公式情報の正規化・訂正・取消・震度3以上表示方針は設計済み。**実XML取得・DB・通知は未実装**。
- [美咲連携契約案](https://github.com/miyazaki1016/emergencyalert/blob/docs/misaki-weather-integration-20261016/docs/AMAFURU_MISAKI_INTEGRATION_CONTRACT_20261016.md): 公式情報の頭脳はアメふる、人格・会話は美咲。契約はDraftでAPI未実装。
- [全国解析引き継ぎ](https://github.com/miyazaki1016/emergencyalert/blob/feat/national-heavy-rain-preview/docs/AMAFURU_HANDOFF_2026-10-13.md): 47都道府県N03分割のCI実験証拠あり。CI成功≠Production acceptance。
- [全国最終ゲート](https://github.com/miyazaki1016/emergencyalert/blob/feat/national-heavy-rain-preview/docs/NATIONAL_FINAL_GATE_PROOF.md): 8 ownership bins、分散処理、仮想スケジューラ検証。原子的子ジョブ所有・実Storage HTTP・本番負荷は未確立。

## 残作業（未実施を明記）

1. 全ブランチの個別ファイルを読み、mainとの意味上の重複と未回収成果を判定。
2. PRごとの実際のmerge状態、HEAD SHA、CI・レビュー状況を取得。
3. 全ソース・ドキュメント・テスト・SQL・workflowのファイル単位所在表を作成。
4. 本番DB・Storage・Vercelの実態を別途読み取り専用で確認。
5. 各機能を「設計」「実装」「テスト」「実データ検証」「本番稼働」に分けて完成判定。

## 次のソラへ

**「りょ」＝「どんどん進めて」。** 返事だけで止まらず調査を続け、証拠をこの台帳に追記する。未読のものを「全部読んだ」と報告しない。
