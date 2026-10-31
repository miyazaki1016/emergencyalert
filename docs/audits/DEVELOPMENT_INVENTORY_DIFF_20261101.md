# 2026-11-01 差分照合・第一段階（読み取り）

- 現行ブランチ112本（main含む）。mainの `docs/PROJECT_OVERVIEW.md` の**ブランチ名文字列検索**では111本中9本の名称を確認、102本は完全一致なし。
- **注意**：アメふるの総覧は作業の索引であり全ブランチ一覧ではない。102本を未登録・未完成と断定しない。開発台帳、別名の資料、過去PR、main統合を個別に照合する。
- 直近の照合優先候補：`fix/severe-once-per-episode-20261031`、`research/severe-rain-consistency-20261101`、`audit/push-concurrency-20261026`、`fix/forecast-bootstrap-20261029`。ブランチの存在確認のみ、状態は未判定（U）。
- 管理用ブランチ `chore/development-inventory-automation-20261031` も検索未一致候補に含まれるため、件数は純粋な機能開発の未登録件数ではない。

次：総覧・開発台帳・関連PRと突き合わせ、作業単位の不足だけを索引に反映する。

## 第二段階：ブランチ内容の実物確認

| 作業 | main比較（調査時点） | 実物の証拠 | 暫定分類・次の確認 |
| --- | --- | --- | --- |
| 大雨予測の継続性研究 | `research/severe-rain-consistency-20261101` ahead 14 / behind 0 | `docs/SEVERE_RAIN_CONSISTENCY_RESEARCH_20261101.md`、研究用純粋関数・テスト | **C暫定**（研究実装・実運用未採用）。文書はPush/DB/通知条件を変更しないと明記。PR #109の実体と照合する。 |
| 30mm/h以上通知のエピソード修正 | `fix/severe-once-per-episode-20261031` ahead 6 / behind 1 | watch-rainの処理、forecastEpisode、テスト等5ファイル | **B/C暫定**（作業ブランチ実装）。main・本番適用を別確認。 |
| Push並行実行監査 | `audit/push-concurrency-20261026` ahead 4 / behind 12 | `docs/audits/PUSH_CONCURRENCY_20261026.md` の静的監査のみ | **D**（監査）。古い時点の危険指摘を現行本番の未修正断定に転用しない。 |
| 予測エピソード初期化修正 | `fix/forecast-bootstrap-20261029` ahead 3 / behind 3 | watch-rain・forecastEpisode・テスト・総覧等8ファイル | **B/C暫定**（ブランチ実装）。既存の重複通知修正と内容・PR・main統合を照合。 |

※ ahead/behindはGit ancestryであり、未統合機能数・完成度を表さない。2026-11-01の読み取り結果。既存台帳の評価を上書きしない。
