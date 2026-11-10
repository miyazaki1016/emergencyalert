# 引継ぎ・再利用・変更検証・案件完成を分けて記録する共通ルール

美咲・アメふる共通。通常チャットの担当AIが使う。過去の照合成功・CI成功を、新しい変更や案件全体の完成へ読み替えない。

## 既存の仕組みを調べた結果

| 要件 | 既存対応 | 今回補う点 |
| --- | --- | --- |
| 既存PR・研究・証拠の発見と再利用判断 | `development_preflight.py` とIssue／PRの `history-preflight` が対応済み | 同じ照合器は作らない |
| コミットSHA付きのActions結果保存 | `development_history_evidence.py` が `head_sha`・status・conclusion・URLを収録済み | 作業終了時に最新HEADを再確認する手順を明文化 |
| 実装・CI・main統合・本番の区別 | 案件の実装・検証・本番欄、SHA付き実行表、未確認表示が対応済み | 引継ぎと再利用も独立した4段階で報告する |
| 通常チャットで結果を読む | Issue本文から依頼を起動、ActionsのSummary・ログ・成果物に結果あり | 実行一覧を手動で探さずIssueコメントから読む返却処理を提案 |

個別案件では[アメふるPR #109の既存CI復旧監査](https://github.com/miyazaki1016/emergencyalert/blob/6e650705260825c33a9905bbd3802919ba341cc4/docs/audits/PR109_CI_RECOVERY_20261103.md)にも、最新HEADと新しいrunのhead_shaを一致させて確認し、旧成功を流用しない手順がある。この既存知見を再利用し、今回は全担当AI向けの終了時ルールへ整理する。新しいCI収集器・検証器は追加しない。

## 4段階の報告（全担当AIで共通）

| 区分 | 成功・完了を判断する根拠 | 成功を意味しないもの |
| --- | --- | --- |
| 引継ぎ成功 | 対象・制約・既存PR／ブランチ・過去の結論・残課題を把握できた証拠 | 新規変更のテスト合格、案件の完成 |
| 既存成果の再利用成功 | 原本URL、reuse／extend／distinctの理由、継続したPR・ブランチ | コミットを追加しただけ、照合候補の表示だけ |
| 新規変更の検証成功 | 最新HEADと対応した必要なActions・ジョブ・テストの成功、対象SHAと実行URL | 過去SHAの成功、Issueの着手前照合、途中・skip・cancel・失敗 |
| 開発案件の完成 | その案件の受入条件を全て満たす証拠と残課題の解消 | 引継ぎ成功、再利用成功、CI成功、main統合だけ |

## コード変更後の終了前チェック

1. PRの最新HEAD SHAをGitHub APIで取得する。手元の最後のコミット番号だけに依存しない。
2. そのSHAに対応するActions実行を取得し、変更内容とworkflowの起動条件から必要な検証を確認する。実行ID・試行番号・status・conclusion・対象SHA・ジョブの結果・実行URLを記録する。
3. 必要な検証が完了してsuccessの場合だけ「新規変更の検証成功」とする。未実行、実行中、失敗、未確認をそれぞれ明記する。権限不足や取得不能は「未確認」。一覧0件は「対象SHAの実行記録なし」と記録し、合格にしない。skip・cancelled・timed_out・action_requiredをテスト合格にしない。
4. 検証確認後にPRのHEADを再取得し、変わっていれば以前の成功を最新HEADへ流用しない。新しいSHAの確認を未完了として残す。
5. 実機・本番・DB等の確認が未許可なら、確認のために実行せず未確認と記録する。引継ぎが成功していても案件は未完成のままでよい。資料だけの変更で対象外の検証は理由を添える。

Issueの照合はmainのプログラムで走る。**そのrunのhead_shaがmainなら、別ブランチの新規コードをテストした証拠にはならない。** 今回追加するIssue結果コメントも着手前の照合結果の返却であり、最新コードのCIや案件完成を認定する処理ではない。

通常チャットで専用のActions一覧ツールがない場合も、GitHubの汎用取得機能が利用できれば次を読む。コメントに実行IDが記録されている場合は、一覧探索を省略してジョブ・ログを取得できる。

```text
GET https://api.github.com/repos/OWNER/REPO/actions/runs?head_sha=最新SHA&per_page=100
GET https://api.github.com/repos/OWNER/REPO/commits/最新SHA/check-runs?per_page=100
GET https://api.github.com/repos/OWNER/REPO/issues/Issue番号/comments?per_page=100
```

ページが続く場合は次ページも取得する。ツールでこれらのURLを取得できない場合だけ、その制約を明示する。専用の一覧ツールが見つからないことだけを理由に、利用者にサイトで実行IDを探してもらわない。

### 次の担当AIへ残す記録

```text
引継ぎ：成功／未確認／失敗（根拠URL）
既存成果の再利用：成功／未確認（対象PR・ブランチ、判断と根拠URL）
新規変更の検証：成功／未実行／実行中／失敗／未確認／対象外
  対象HEAD SHA：
  必要な検証と実行ID・試行・結果・URL：
  終了前に再取得したHEAD SHA：
案件完成：完成／未完成／未判定（受入条件と未完了事項）
次に行うこと：
禁止事項・未許可の操作：
```

## 成功事例：アメふる Draft PR #164（2026-11-10時点の記録）

対象は **miyazaki1016/emergencyalert のPR #164**。美咲の同番号PRとは別案件。

| 区分 | 今回の記録 |
| --- | --- |
| 引継ぎ | 成功。ユーザーの引継ぎ報告に加え、Issue #163の依頼・判断、照合のREVIEW_RECORDEDを確認 |
| 既存成果の再利用 | 成功。既存PR・既存ブランチ `feat/vercel-quota-monitor-20261105` を継続。extend判断を記録し、前任SHAから3コミット追加をGitHub比較APIで確認 |
| 新規変更の検証 | 未完了。報告対象HEAD `56fe1fc85725c7f88931e5e77ed353a540a2e5eb` のActions一覧とcheck-runsは今回の確認で0件。成功とは扱わない |
| 案件完成 | 未完成。正式な実使用量・残量の取得方法等が未解決。既存方針は `quota_verified=false`／`safe_to_gate=false`。自動停止・再開の有効化を意味しない |
| main・本番 | 元のPRはopen・Draft。引継ぎ成功からmain統合・本番反映を推測しない |

前任基準SHA：`7e61e6c7fc653735dcc327fa2e1ade34beb4dab1`

| 追加コミット | 作業内容 |
| --- | --- |
| `0dbc76f260f5da39543f7ceb1b937f2e76ce160e` | 対象プロジェクトと不完全なページングを不明時に安全側へ扱う修正 |
| `9ff1861cf889df7b086fd15d38116b0fe7f40b4d` | 2プロジェクト限定とページングのテスト追加 |
| `56fe1fc85725c7f88931e5e77ed353a540a2e5eb` | 正式利用量の未解決事項とゲート前提を文書化 |

一次証拠：

- [既存Draft PR #164](https://github.com/miyazaki1016/emergencyalert/pull/164)
- [既存Issue #163の依頼・判断記録](https://github.com/miyazaki1016/emergencyalert/issues/163)
- [前任SHAからの3コミット比較](https://github.com/miyazaki1016/emergencyalert/compare/7e61e6c7fc653735dcc327fa2e1ade34beb4dab1...56fe1fc85725c7f88931e5e77ed353a540a2e5eb)
- [Issue起点の照合成功 run 42746003789](https://github.com/miyazaki1016/emergencyalert/actions/runs/42746003789) — jobのログはREVIEW_RECORDED。実行headはmainの `072cf6d72ac0b6ca7fbb53ac1afd3a19c8f39548` で、報告対象コードのHEADとは異なる
- [報告対象HEADの方針原本](https://github.com/miyazaki1016/emergencyalert/blob/56fe1fc85725c7f88931e5e77ed353a540a2e5eb/docs/operations/VERCEL_SHARED_DEPLOYMENT_POLICY_20261106.md)

この記録はその時点のスナップショット。後からCIが実行された場合は、過去の未確認記録を削除せず、新しいSHA・実行URL・確認日時を追記する。

## 実行IDの手動探索を省けた事例：美咲Issue #174

2026-11-10、専用のActions実行一覧ツールが見つからないという引継ぎ報告を受け、GitHubの汎用取得で `GET /repos/miyazaki1016/misaki/actions/runs?event=issues&per_page=100` を読み、[run 42750579698](https://github.com/miyazaki1016/misaki/actions/runs/42750579698)を特定した。ジョブログはREVIEW_REQUIREDで、pr-151とpr-44の原本確認待ちだった。利用者がサイトで探す必要はなかった。Issueの自動結果コメントは、この探索自体を通常の手順から省くための追加案。この事例の記録時点では返却処理はDraftだった。現在の導入状態は最新mainのworkflowと、実際のIssue結果コメントで確認する。
