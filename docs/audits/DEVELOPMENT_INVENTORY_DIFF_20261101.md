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

## 第三段階：PRと作業単位の突合

| ID | 作業群 | PR・証拠（2026-11-01確認） | 状態と次の一手 |
| --- | --- | --- | --- |
| A-REPLAY-01 | 通知予測・実況の自動照合 | PR #99 **merged**（2026-10-29）、main台帳に統合記録あり | main統合は確認。**本番・DB・実機はPRマージのみでは認定しない**。既存台帳の本番証拠を再利用し最新差分だけ確認 |
| A-SEVERE-01 | 大雨予測継続性研究 | PR #109 **open Draft、未マージ**。研究用関数・テスト・文書 | C暫定。通知ロジックへの採用は未確認、研究と本番を分離 |
| A-SEVERE-02 | 強雨通知のエピソード制御 | `fix/severe-once-per-episode-20261031`（watch-rainとテストに差分） | B/C暫定。main・本番適用の照合が必要 |
| A-EPISODE-01 | 予測エピソード修正 | `fix/forecast-bootstrap-20261029`（watch-rainと資料・テストに差分） | B/C暫定。強雨通知修正との重複を確認 |
| A-PUSH-01 | Push並行実行・永続claim | `audit/push-concurrency-20261026` の監査文書、PR #63 **open Draft、未マージ** | D（監査）／別PRの実装案は未採用。既存制約との整合を優先確認 |

※ 同じwatch-rainを変更する複数ブランチを機能数として足し算しない。PR #107は管理用Draft PR。PRのopen/mergedは機能品質や本番適用を保証しない。

## 第四段階：既存台帳との整合修正（2026-11-01）

- **A-REPLAY-01は過去証拠を保持する。** main `docs/DEVELOPMENT_LEDGER.md` にはPR #99のmain統合コミット `b6c216be96ecadcb9f86f2042ee6e786800b30c8` と `watch-rain v32`、`evaluate-rain v1` の**本番反映済み記録**がある。従って「本番未確認」と一律に戻すのは誤り。**既存記録上は本番反映済み、現在の稼働状態は別途未確認**とする。
- PR #99のGitHub状態も **closed/merged（2026-10-29）** と一致。PR #63はopen Draftのまま。研究PR #109はopen Draftのまま。
- `fix/severe-once-per-episode-20261031` と `fix/forecast-bootstrap-20261029` は同じ `watch-rain/index.ts` / `forecastEpisode.ts` を変更する。**重複する可能性がある作業群**として扱い、片方のブランチを単純に未実装リストへ追加しない。
- 未確認は最新の本番バージョン・稼働・実機の差分に限定し、過去の証拠を無効化しない。

## 2026-11-01 管理PRの差分・CI最終レビュー

- 管理Draft PRの変更ファイルは計7件。内訳は棚卸し用workflow 1、読み取り専用スクリプト1、回帰テスト1、管理・監査ドキュメント4。アプリ本体、DBマイグレーション、Push、本番設定ファイルの変更は差分に含まれない。
- 最新コミットのPR起動CIは成功。`Offline regression tests` 成功、`Read-only inventory` と `Save report artifact` はPRでは両方skip。実データ棚卸しの成功と取り違えない。
- 両リポジトリのworkflowに週次cron（UTC月曜01:17、日本時間月曜10:17）と手動実行の定義がある。main未統合のため定期実行は未開始。**main統合すると週次実行が有効になるため別途承認が必要**。
- GitHubのブランチ検索による独立した読み取り確認では、アメふる112、美咲109（各main含む）。PR・Issueの実データを棚卸しスクリプト自身が集計するE2E検証は未完了。
- 受入残件：読み取り専用の実データ収集、PR/Issue集計の既存台帳との突合、誤検出レビュー、main統合とschedule開始の承認。
