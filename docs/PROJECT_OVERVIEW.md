# サキくる / emergencyalert.news — 総覧

**担当AIは最初に[既存成果の自動照合](WORK_HISTORY_PREFLIGHT.md)を実行する。** 依頼文から過去の実装・未統合研究・数値結論を確認し、再利用判断を記録してから新規実装・再測定を始める。Issue／PRでも自動チェックする。

> [!CAUTION]
> **開発・調査・検証・修正・再測定を始める前に、必ず[日本語開発履歴検索](https://miyazaki1016.github.io/misaki/history.html)を確認すること。** 機能名・日本語キーワード・コード名・過去の数値で検索し、未統合ブランチも含めた過去の実装、検証結果、根拠リンク、残課題を読む。**同じ作業を繰り返す前に、既存成果から再開できるか判断する。** 手順は[日本語開発履歴の運用](WORK_HISTORY_OPERATIONS.md)。検索結果がない・不十分なときは原本のPR・ソース差分・テスト・Actionsを確認し、未確認は未確認のまま扱う。main統合／CI成功／本番反映は区別する。

> [!IMPORTANT]
> **製品の原点と最終像は [サキくる製品憲章](SAKIKURU_PRODUCT_CHARTER.md) に恒久保存。** 親サイト emergencyalert.news（呼称「サキくる」は正式確定未確認）、雨コンテンツ「アメふる」（MY地点監視／全国30分以内30mm/h以上の大雨予報と雨雲アニメーション）、将来のトップページの基盤「LIVE JAPAN」は別々の役割。**既存の全国大雨 PR #59／LIVE JAPAN PR #61 を再実装前に確認し、47都道府県N03データは無断削除しない。**
>
登録地点で雨が降り始めるタイミングを、少ない通知で正確に伝える。

> [!IMPORTANT]
> **担当ソラはここから [開発台帳](DEVELOPMENT_LEDGER.md) へ。** 案件の状態・担当・次の一手は台帳を更新する。再開前に、該当PR・ブランチ・詳細資料を実際に確認する。

| 知りたいこと | 開く場所 |
| --- | --- |
| **製品理念・完成形・3つの役割（恒久）** | [サキくる製品憲章](SAKIKURU_PRODUCT_CHARTER.md) |
| **過去の作業内容・検証結果・全PR/ブランチを探す** | [過去作業の履歴索引](WORK_HISTORY_INDEX.md) |
| **着手前に必ず見る：過去の日本語開発履歴** | [両プロジェクト共通の検索画面](https://miyazaki1016.github.io/misaki/history.html) · [運用手順](WORK_HISTORY_OPERATIONS.md) |
| 案件の現在地・証拠・次の一手 | [開発台帳](DEVELOPMENT_LEDGER.md) |
| 自分の判断待ち・担当への引き継ぎ | [美咲 × アメふる承認ボード](https://miyazaki1016.github.io/misaki/) |
| PR・ブランチの自動棚卸し | [GitHub Actions](https://github.com/miyazaki1016/emergencyalert/actions) → 最新成功の `development-inventory` |
| 開発・確認・リリースの規約 | [共通運用規約](DEVELOPMENT_MANAGEMENT_STANDARD.md) · [Vercelビルド運用](VERCEL_BUILD_POLICY.md) |
| 過去の判断・未統合研究・詳細な開発史 | [整理前の総覧・全文保存版](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/PROJECT_OVERVIEW.md) · [旧開発台帳・全文保存版](https://github.com/miyazaki1016/emergencyalert/blob/9d47267330929aa4c2142bdd0c829185fe022d18/docs/DEVELOPMENT_LEDGER.md) |

## 新しいソラへの引き継ぎ（共通ひな形・必須）

**新しいチャットで担当ソラに開発を渡すときは、以下をコピーし「今回やりたいこと」「守る条件・直前の状況」を埋める。** 美咲とアメふるを同時に変更せず、指定された対象だけを扱う。担当AIはひな形の指示を実行すること。**総覧を読むだけ・検索画面を案内するだけでは着手前確認を済ませたことにならない。**

```text
開発を引き継いでください。

対象リポジトリ：
美咲：miyazaki1016/misaki
アメふる：miyazaki1016/emergencyalert
※今回の対象だけを作業してください。

今回やりたいこと：
（ここに依頼内容を書く）

守る条件・直前の状況：
（あれば書く）

最初に最新mainのAGENTS.mdと
 docs/WORK_HISTORY_PREFLIGHT.mdを読んでください。

引継ぎ先は通常チャットを基本としてください。
WorkやローカルPythonの実行環境を前提にしないでください。

実装・調査・再測定を始める前に、今回の依頼文で既存成果を照合してください。
Pythonを実行できない場合は、GitHub連携で同じ作業の既存Issueを再利用するか、
対象リポジトリへ依頼内容のIssueを登録してください。
自動起動する「Existing work preflight」の今回の実行結果・ログを読み、
提示された原本を確認してください。
再利用判断と証拠URLをIssue本文のhistory-preflightに記録し、
本文編集後の新しいActions実行で結果を確認してから進めてください。
PRを作る際は、Issueへのリンクと判断記録をPR本文にも記載してください。

実行環境がある場合はscripts/development_preflight.pyのCLIも使えます。
必要なGitHub操作ができない場合は、不足する機能・権限を明示してください。

提示された過去のコード・検証結果・未統合研究・
残課題を読み、再利用判断を記録してから進めてください。
同じ実装や実験を最初から繰り返さないでください。

コード変更後は、最新PR HEADに対応する必要なActions結果を確認してください。
引継ぎ成功・既存成果の再利用成功・新規変更の検証成功・案件の完成を
別々に記録し、未実行・実行中・失敗・未確認を成功扱いしないでください。
Issueの結果コメントから実行IDを読める場合は、利用者にサイトで探させないでください。

履歴やコードを取得できない場合は、
確認できたふりをせず、その箇所を明示してください。
```

**担当AIの実施順序（通常チャット）：** 最新mainの[AGENTS.md](../AGENTS.md) → [Actions経由の着手前照合手順](WORK_HISTORY_PREFLIGHT.md) → 対象Issueの登録・更新 → 今回のActions結果・原本を読む → Issue本文へ再利用判断を記録 → 編集後の新しい実行を確認 → 未解決分のみ作業。PRにもリンクと判断を記録する。実行環境があればCLIも使える。照合不能は未確認と明記し、main統合・CI成功・本番反映・実機確認を区別する。

## 主な領域

雨の判定ラボ、予測通知の重複抑制、独立案件の防犯情報メール。 案件の進捗は[開発台帳](DEVELOPMENT_LEDGER.md)を参照。

[雨の判定ラボ](RAIN_RESEARCH_DASHBOARD_20261029.md) · [予測と実況の照合](NOTIFICATION_REPLAY_PRODUCTION_20261029.md) · [共通の開発管理総覧](https://github.com/miyazaki1016/misaki/blob/main/docs/DEVELOPMENT_MANAGEMENT_OVERVIEW.md)

## 守る運用ルール

- 予測と実況の自動照合を基本にし、現地報告は任意の参考。欠測・判定不能を「降らなかった」にしない。
- 通常通知と30mm/h以上の重要通知は別扱い。通常通知を送信済みでも、大雨の初回通知は別に扱う。
- 雨通知と防犯情報メールは別案件。配信・DB・スケジュールの変更はそれぞれの条件と証拠を確認する。
- 検討・研究がmainにない場合は、ブランチとファイルの所在を台帳に登録する。詳細が別ブランチにある場合は、そのブランチを取得して確認する。
- 自動棚卸しは差分と確認候補を出す。完了・本番反映・実機確認を自動認定しない。
- **Vercelの自動プレビューは停止中。** 画面修正は必要に応じて手動で確認する。mainのアプリ変更は本番ビルド、判定できる資料だけの更新はビルド処理を省略する。省略でも回数枠に数えられる場合がある。詳しくは[運用ルール](VERCEL_BUILD_POLICY.md)。
- 修正は **テスト → 必要なプレビュー → main → 本番READY → 実機確認** を区別して記録する。未確認は未確認のまま残す。

整理日：2026-11-05。全文保存版には旧見出し・相対リンク・履歴をその時点のまま残している。

[共通の4段階区分・最新HEADの検証・引継ぎ成功事例](WORK_HISTORY_HANDOFF_VALIDATION.md)。
