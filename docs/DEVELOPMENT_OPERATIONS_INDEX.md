# アメふる 自動棚卸し用の運用索引

> **人が更新する案件の状態・担当・次の一手は [開発台帳](DEVELOPMENT_LEDGER.md) に集約。** この索引は既存の自動棚卸しが参照する案件ID・照合名・パスと、GitHubから取得した事実を保持する。

| ID | 照合名 | 照合用の所在 |
| --- | --- | --- |
| A-01 | 重複通知・エピソード | `docs/FORECAST_EPISODE_FIX_20261029.md` |
| A-02 | 予測40分後通知・30分境界 | `docs/audits/FORECAST_HORIZON_20261101.md` |
| A-03 | 旧履歴Deep Link | `docs/audits/FEATURE_RECONCILIATION_20261101.md` |
| A-04 | 旧履歴復元計画 | `docs/audits/INVENTORY_RECONCILIATION_20261101.md` |
| A-05 | 雨域研究・旧通知テスト | `docs/audits/TEST_CASE_RECONCILIATION_20261101.md` |
| A-06 | 匿名認証・旧監査証拠 | `docs/audits/LEGACY_AUDIT_FOLLOWUP_20261101.md` |

自動取得は確認候補。案件の進捗・本番状態を自動確定しない。旧運用手順と状態は[整理前の運用索引](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/DEVELOPMENT_OPERATIONS_INDEX.md)で確認できる。

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
| #160 | 雨の判定ラボ：現地保留を主判定から外し、降り始め不明を補足表示 | fix/rain-lab-hold-copy-20261105 |
| #164 | feat: Vercelデプロイ履歴の読み取り専用監視（自動制御前段階） | feat/vercel-quota-monitor-20261105 |
| #165 | docs: 雨の判定ラボ173コマの方式差分・未検証事項を整理 | research/rain-lab-five-frame-differences-20261105 |

全ブランチのmain差分と滞留候補はGitHub Actionsのdevelopment-inventory成果物を参照。
既存案件ID・判断欄は変更しません。

<!-- OPERATIONS_INVENTORY_END -->
