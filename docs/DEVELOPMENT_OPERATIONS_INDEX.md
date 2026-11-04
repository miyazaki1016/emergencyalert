# 開発案件・運用索引（2026-11-01時点）

> この表は棚卸しの**交通整理用**。担当は作業の引継ぎ先を示し、本人の受諾や完了を意味しない。過去の監査記録を現在の本番状態と混同しない。main・本番・実機の判定は証拠がない限り未確認。

| ID | 作業 | 現在の管理状態 | 引継ぎ先 | 証拠・所在 | 次の一手 |
|---|---|---|---|---|---|
| A-01 | 重複通知・エピソード | 担当側で検証中 | アメふる担当ソラ | `docs/FORECAST_EPISODE_FIX_20261029.md` | 担当ソラの検証結果を受領して台帳更新 |
| A-02 | 予測40分後通知・30分境界 | 記録済み・仕様判断待ち | アメふる担当ソラ | `docs/audits/FORECAST_HORIZON_20261101.md` | 通知ID576の確認事実を担当へ引継ぎ。精度検証はしない |
| A-03 | 旧履歴Deep Link | mainに主要ロジック確認済み・差分未評価 | アメふる担当ソラ | `docs/audits/FEATURE_RECONCILIATION_20261101.md` | 不足の断定を避け担当側判断待ち |
| A-04 | 旧履歴復元計画 | 復元しない方針・保全 | 棚卸し担当ソラ | `docs/audits/INVENTORY_RECONCILIATION_20261101.md` | 旧移行手順を実行しない |
| A-05 | 雨域研究・旧通知テスト | 旧資産保全・照合待ち | アメふる担当ソラ | `docs/audits/TEST_CASE_RECONCILIATION_20261101.md` | 現行実装との重複確認は担当へ引継ぎ |
| A-06 | 匿名認証・旧監査証拠 | 保全 | 棚卸し担当ソラ | `docs/audits/LEGACY_AUDIT_FOLLOWUP_20261101.md` | 旧資料を保全し無断で認証復元しない |

## 運用
- 毎日10:17 JSTにread-onlyのGitHub Actions棚卸し。`development-inventory` artifactに `report.json` / `summary.md` を30日保持。**台帳へ自動反映はされない**。
- 週次は新規・消滅・状態変化の候補を確認し、この索引に**変更があった案件だけ**追記・更新する。週次詳細照合は自動化済みではない。
- 未整理ブランチの原資料: [一次分類](audits/BRANCH_TRIAGE_20261101.md) / [初回調査](audits/INVENTORY_RECONCILIATION_20261101.md)。全件の履歴はGitHub Actions成果物を参照。
- 実装、予測精度の検証、DB、Push、デプロイ、ブランチ削除は担当ソラの領域。ここでは発見事項・所在・引継ぎ先だけを記録する。

## 日次レポートと週次差分の確認手順
1. GitHub Actionsの `Development inventory (read-only)` の最新**成功**runを開き、`development-inventory` artifactの `report.json` / `summary.md` を取得する。失敗・未実行なら前回値を最新値と扱わず、実行日時を明記する。
2. 前回の成功runと比較する対象は、ブランチの追加・消滅・head変化、PRの新規・open/closed/merged変化、Issueの新規・状態変化、長期停滞候補の増減。**集計件数の差だけで作業完了・未統合・削除可能とは判断しない**。
3. 変化を見つけたら、対応する案件IDと証拠（PR・commit・ブランチ・run ID）を照合する。新規案件だけIDを追加し、既存案件は状態・次の一手・確認日を更新する。変更なしなら台帳の不要な書き換えはしない。
4. 旧ブランチの保全・削除判断、アプリ実装、DB、Push、本番変更は担当者と別途判断する。週次差分確認は**手順の定義のみ**で、現時点で自動実行されない。

### 更新時の最小記録
`確認日（JST） / 案件ID / 変更前→変更後 / 証拠URL・run ID / 引継ぎ先 / 次の一手 / 未確認事項`。

## 第4段階：台帳の安全な自動更新（導入前の運用契約）

- **事実ログと判断欄を分離する。** GitHub APIで確認できたPR番号・タイトル・状態・head SHA・更新日時・証拠URLのみを、機械管理の独立セクションへ追記する。開発案件の進捗、完了、本番稼働、実機確認、担当者の判断欄は変更しない。
- **PR方式を優先する。** 自動化は専用ブランチ上に更新案を生成し、差分がある場合のみ台帳更新PRを作る。初期段階は自動マージせず、実データの正確性と重複防止を確認してから限定的な自動マージを検討する。
- **証拠が不足する場合は更新しない。** 比較不能、API失敗、分類の曖昧さ、100件を超えるファイル一覧、既存台帳との競合は確認待ちとして記録する。PRマージだけで開発完了と判断しない。
- **冪等性。** PR番号とhead SHAなどの安定した識別子を使い、再実行しても同じ事実を重複追記しない。自動化自身のPRは製品開発案件へ割り当てない。
- **安全境界。** アプリコード、DB、認証、Push、デプロイ、ブランチ削除は操作しない。GitHub Actionsの書込権限は台帳更新専用ジョブに限定し、既存のread-only棚卸しは維持する。

この節は設計合意の記録であり、台帳の自動書込みが稼働していることを意味しない。

<!-- OPERATIONS_INVENTORY_START -->
## GitHub自動棚卸し（確認用の事実）

> これはPRの状態だけを示し、開発完了・本番反映・実装重複を意味しません。

開発台帳: [DEVELOPMENT_LEDGER.md](DEVELOPMENT_LEDGER.md)

| Open PR | タイトル | Head branch |
|---|---|---|
| #25 | test: verify live JMA early rain data in CI | test-jma-early-live-smoke |
| #59 | Add nationwide heavy-rain scan proof | feat/national-heavy-rain-preview |
| #60 | docs: 美咲との気象・防災連携契約案（未実装） | docs/misaki-weather-integration-20261016 |
| #61 | feat: LIVE JAPAN 生きている日本列島の体験試作 | feat/live-japan-experience-prototype |
| #62 | test: measure real JMA Z4 stride-2 missed rain regions (read-only) | test/z4-stride-parity-20261016 |
| #63 | WIP: MYアメふる通知履歴・実天気フィードバック・判定根拠（検証用） | feat/my-rain-notification-history-20261019 |
| #73 | fix: retained notification history stays viewable beyond seven days | fix/archived-history-beyond-seven-days-20261023 |
| #88 | docs: 通常雨通知の見直し仕様と検証条件 | docs/rain-notification-phase1-20261026 |
| #93 | WIP: 通知重複防止・配信整合性の第1優先監査 | audit/push-concurrency-20261026 |
| #94 | docs: 降るよ最優先の製品方針と研究所在を総覧へ | docs/rain-start-first-index-20261028 |
| #95 | 設計: 前回通知を踏まえた雨接近メッセージ | research/contextual-rain-alerts-20261028 |
| #96 | 外部AIレビュー用の安全な静的ページ（プレビュー専用） | docs/external-ai-review-preview-20261028 |
| #97 | Preview only: 外部AIレビュー用の公開総覧 | review/external-ai-page-20261028 |
| #98 | 研究: 通知予測と実況の自動答え合わせ基盤 設計 | research/notification-replay-20261029 |
| #109 | 研究用: 大雨予測の継続性判定（通知ロジック非接続） | research/severe-rain-consistency-20261101 |
| #155 | Draft: JASPIC無送信MIME互換・Windows旧版比較と独立移植 | research/jaspic-mail-compat-20261104 |

全ブランチのmain差分と滞留候補はGitHub Actionsのdevelopment-inventory成果物を参照。
既存案件ID・判断欄は変更しません。

<!-- OPERATIONS_INVENTORY_END -->
