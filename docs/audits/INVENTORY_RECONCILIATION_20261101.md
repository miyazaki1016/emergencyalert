# 開発棚卸し・認証/通知履歴/Push調査（2026-11-01）

## 棚卸しの証拠
- 週次棚卸し: `.github/workflows/development-inventory.yml`、月曜10:17 JST、read-only、artifact保持30日。
- 初回手動実行: [Actions run 41238111625](https://github.com/miyazaki1016/emergencyalert/actions/runs/41238111625)。112ブランチ、過去PR105件、open PR15件、open Issue3件、要確認96ブランチ、長期未更新PR5件。要確認数は削除可能数ではない。
- PR履歴が見つからない6ブランチ: `docs/amafuru-source-audit-20261016`（ahead70/behind40）、`docs/auth-recovery-security-assessment-20261024`（ahead1/behind22）、`fix/archived-history-deeplink-20261023`（ahead5/behind34）、`plan/legacy-notification-history-migration-20261024`（ahead2/behind25）、`research/rain-field-morphology-20261023`（ahead5/behind32）、`test/watch-rain-notification-regression-20261018`（ahead8/behind40）。いずれもdiverged。**直接mergeしない**。

## 機能・資料の差分
- `fix/archived-history-deeplink-20261023`: 旧Pushのdeep linkで履歴7日制限を外す `historyQuerySince` と関連テストがブランチ側に存在。mainの `NotificationFeedbackHistory.tsx` は確認時点で7日間 `.gte("delivered_at", since)` を使う。現在の要件に照らして機能差を評価。旧履歴の復元を意味しない。
- `test/watch-rain-notification-regression-20261018`: 通知判定の回帰テスト・JMA14桁時刻処理の検討が残るが、`watch-rain/index.ts` などはmainと大きく異なる古い実装。**本番通知コードを取り込まない**。テスト観点のみ抽出。
- `research/rain-field-morphology-20261023`: 250m/500m/1km等の雨域占有率、欠損と雨なしの区別、地上観測との照合を扱う研究計画。mainの `docs/PROJECT_OVERVIEW.md` に関連記載あり。過去資料の「未実装」を現在の状態とみなさない。
- `docs/auth-recovery-security-assessment-20261024`: iPhone PWAの匿名セッション喪失に関する当時の読み取り調査。Push endpoint、owner ID等だけで認証を復元してはいけない。mainに同名ファイルはなし。
- `plan/legacy-notification-history-migration-20261024`: 当初は旧履歴移行を計画したが、**同資料末尾の2026-10-24決定更新で「旧履歴は復元せず現在の匿名IDで再スタート」へ変更**。前段の移行手順を現行の実施指示として扱わない。mainに同名ファイルなし。

## 本番DB読み取り確認（2026-11-01）
Supabaseプロジェクト `EmergencyAlert` に対して集計SELECTのみ実行。生のendpoint、所有者ID、暗号鍵は記録しない。
| 指標 | 値 |
|---|---:|
| push_subscriptions | 2行 |
| 異なるendpoint | 2 |
| Push購読owner数 | 1 |
| 同一endpoint重複行 | 0 |
| watch_targets | 15行、owner 4 |
| notification_deliveries | 465行 |

**解釈**: 10/24資料にあった「旧・新owner間の同一Push endpoint重複」は、この照会時点では確認できない。2件の異なる購読が正常かどうかは未判断。10/29の重複通知が解消した証拠ではない。通知エピソードの終了・再通知条件（`clear_streak >= 3` 等）と実配信ログを別途照合する。

## 未解決・次の一手
1. 現行の重複通知修正PR/本番状態とこの記録を照合。送信済み判定・エピソード状態・実配信をID単位で検証。
2. 匿名認証のセッション喪失は過去調査と現行コードを比較。旧ownerの復旧・移行を自動実行しない。
3. 研究・回帰テストの有効部分のみ現行設計へ引き継ぐ。既存の実装を重複作成しない。
4. **この作業ではSQLの更新・削除、DB migration、Push変更、アプリ実装、deployは行っていない**。
