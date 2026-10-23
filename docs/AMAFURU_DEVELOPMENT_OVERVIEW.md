> **2026-10-23 追補（新チャット実機再確認）— この文書の2026-10-21時点の「iPhone未検証」「第1段階未公開」は古い。最新正本は main の `docs/PROJECT_OVERVIEW.md` 冒頭「最優先・新チャット引継ぎ正本（2026-10-23）」。その内容を実際に照合した。**
>
> - ユーザー提供iPhone実機スクリーンショット（2026-10-23 08:29頃）：通知フィードバックの画面を開ける。「ここまでの通知を画面から整理」後、「新しい通知から表示中」「回答できる通知0件／回答済み0件／未回答0件」「整理後の新しい通知はまだないよ」、以前の通知を見る（直近7日で10件）の文言を確認。**DBデータは削除せず、端末別localStorage境界で画面上のみ整理**する仕様。これは新規Pushの到達・気象予報の的中・全履歴復元を証明しない。
> - mainの最新引継ぎ正本には、PR #65（フィードバックとDB保存・再読み込み・iPhone確認）、#66（初期2件/5件ずつ追加）、#68（カード展開）、#69（回答集計）、#71（観測時刻保存・DB／PWA再読込、iPhone確認）、#72（非破壊な履歴画面リセット）の**main統合と本番実機検証**が記載されている。PR #74（空履歴文言改善）とPR #75（引継ぎ更新）もGitHubに存在。旧本書の#63中心「未実装」を現在状態と解釈しない。
> - 重要：PR #63は第2段階（Pushに通知ID先行付与・詳細証拠・障害対応）の**未マージ**試作。第1段階#65の既存配送履歴への回答とは別。#63をまるごと導入済みと誤認しない。
> - 2026-10-23時点のmain正本に記された残作業：#73の7日超アーカイブ閲覧をレビュー（直近のGitHub検索ではopen）、画面整理後に届く**新規通知**について実際の天候確認→回答→保存→再表示、通知時の予測対象時刻/根拠snapshot、新しいPush deep linkの検証。Issue #70（観測時刻と予測対象時刻の突合）、Issue #64（worker/DBの事故対策）は未完。元雨雲画像の永続保存・半径選択・予報精度評価も未完成。
> - **証拠の区別**：今回スクショで直接確認＝整理後画面と0件表示。以前の実機操作・本番DB/CI/READY＝main正本の記録を確認したもの（今回再操作・再測定したわけではない）。本番DB/Push/Edge・mainはこの追補で変更しない。
>
# アメふる 開発総覧

## 2026-10-23 運用決定：毎作業GitHubチェックポイント（ユーザー明示指示）

**どこで会話・ツール実行が途切れても、直前に完了した作業まで第三者がGitHubだけで追跡し、再開できることを必須とする。** チャット内での報告だけで完了扱いしない。

1. **開始時**：mainの最新 `docs/PROJECT_OVERVIEW.md`（正本）と、この監査ブランチの総覧、対象branch/PR/Issueの現物・HEAD SHAを読み、前回の最終チェックポイントを確認する。
2. **作業単位ごと**：調査・コード変更・検証・UI調整など、意味のある一つの作業が終わるたび、**次の作業に入る前に**GitHubの正本または専用監査ブランチに「何をした／なぜ／結果／残り」を追記してcommit/pushする。長い作業は途中にも小さなcheckpointを刻む。
3. **必須記録**：記録日時（JST）、対象repo/branch/開始HEADと終了commit、目的・判断理由、実施操作と変更ファイル、CI/test/run・実機・本番など**根拠の種類**と結果、未実施・未確認・失敗/ブロック、次に実行する具体的1手。PR/Issue/参照文書へのリンクを付け、現状と旧記録を混同しない。
4. **保存確認**：書込み成功の応答だけでなくremoteから対象ファイルを再取得し、内容とcommitを確認する。書込みが拒否・失敗したときは**未保存**と明記し、反映したことにしない。自動後追い反映も仮定しない。
5. **順序・境界**：既存記録を消さず最新のcheckpointへの入口を文書先頭に置く。mainへの実装反映、PRマージ、Vercel/Supabase本番変更、DB削除、Push送信などは従来どおり別の承認が必要。**この運用指示はそれらの包括承認ではない**。
6. **引継ぎ**：新しいソラは一番新しいremote保存済みcheckpointから再開し、「途中で終わった作業」「次の1手」を優先して確認する。開始時に古い総覧だけを読んで現在地を誤認しない。



> **上位構想**: `docs/SAKIKURU_CONCEPT.md`。サキクルは生活の先回り見守り、アメふるはその最初の雨の機能。防災専用ではない。


> **新チャットは `docs/amafuru-source-audit-20261016` の `docs/AMAFURU_CHAT_HANDOFF_20261021.md` を最初に読む。**

更新: 2026-10-21。基本構想: `docs/AMAFURU_CONCEPT.md`。全ブランチ台帳: `docs/AMAFURU_BRANCH_AUDIT_20261021.md`。
この総覧は現時点の横断入口。既存のルート `PROJECT_OVERVIEW.md` と `docs/PROJECT_OVERVIEW.md` は異なる文書・版であり削除・統合上書きしない。ブランチごとの版を監査JSONに固定した。

## 現在地

66ブランチ・63 PR。56 merged、1 closed-unmerged（#21）、6 open（#25/#59/#60/#61/#62/#63）。main基準 `024bb57ac04a7830eeea61183baee4f249a65e4c`。全HEADの375 path+blob資産、47 Markdown版を所在確認。本文の全版読了ではない。

| 系統 | 実装・証拠 | 未完成・次のゲート |
|---|---|---|
| MY既存機能 | mainに現在地/住所/地図、登録地点、雨API、PWA/Push、通知状態/配信履歴。main HEAD CI run 38869703371 success | 2026-10-21の本番デプロイSHA/Edge/DBとの同一性は未照合。旧監査のv29差分は当時の証拠で現行状態とは断定しない |
| 通知履歴・検証 #63 | branch `feat/my-rain-notification-history-20261019` HEAD `25f78d40858a51d800df014139545ca92813f4ed`。30ファイルのmain分岐後差分。ID先行作成・直リンク・根拠snapshot・feedback・shadow・offline集計 | 最新CI run 39435320536でverify/test/buildと隔離Postgres RLS job成功。実Supabase HTTP RLS、iPhone、実気象、画像保存/判定範囲は未完。段階公開NO-GO |
| 全国大雨 #59 | branch `feat/national-heavy-rain-preview`、全国JMA走査・queue/worker・N03/境界・多数proof。HEAD CI run 38831518366と5 proof success | 追加workflowのfailureも存在。proofの安全経路と実routeの統合、全国coverage、実Storage/DB IO、負荷/期限、ライセンスは未完。Production readiness NO |
| 走査検証 #62 | branch `test/z4-stride-parity-20261016`、baseは#59。HEAD CI 38967793351、proof 38967793373 success | 旧監査に6時刻で274/358強雨画素未抽出と記録。今回ログ再取得前の引用値。全国/通知漏れ数の保証ではない。追加workflow失敗も別管理 |
| 通知回帰テスト | `test/watch-rain-notification-regression-20261018` HEAD `0e8ed4c4e61f228a404b3d97e93355c3229cfbfb` | HEAD Actions run 0件。追加テストと実行成功を混同しない。JMA日時・複数降雨エピソードの検証継続 |
| LIVE JAPAN #61 | `feat/live-japan-experience-prototype`、地図UI/デモ/event contract。HEAD CI success | 公式XML取得、永続履歴、全国共通結果接続、実災害表示・通知は未完成 |
| 美咲契約 #60 | `docs/misaki-weather-integration-20261016`、Draft契約。HEAD CI success | API/認証/正式契約/本番接続未実装。別プロジェクトへ変更しない |
| JMA live smoke #25 | `test-jma-early-live-smoke`、openの実データ検証提案 | HEAD run 0件。過去run・後継との比較未完。実際に実行したと扱わない |

## システム構成と責務

- Next.js/React/TypeScript: `app/page.tsx`、PWA `public/sw.js`、`app/api/rain/route.ts`、住所API。ブラウザは選択地点・通知許可・表示を担当。
- 気象: `JmaPublicImageProvider` → `RainInterpretationEngine` → 公開可否gate → semantic event → 表示。元データの観測/予報・baseTime/validTime・鮮度・UNKNOWNを保持。
- 登録地点worker: `supabase/functions/watch-rain/index.ts` → 雨API → 診断/状態/購読 → web-push → 配信記録。Supabase Auth/DB/RLS/cron/Edgeは別の実環境資産。今回その接続先に操作していない。
- 全国proof: #59のqueue/cycle/worker、地理データloader、N03/町丁目proof、SQL、CI。mainの登録地点通知と分離されている。

## 優先調査と既知の制限

1. #63に既に実装されたID・履歴・feedbackを再発明しない。まず既存差分をレビューし、隔離環境の前提を確定する。#63の旧「IDなし」記述は設計時の現行mainについてであり、最新branchコードの未実装宣言として引用しない。
2. main workerの `severeFrame` は `new Date(f.validTime)`、JMA14桁時刻のparserとの不一致候補。静的確認済み。強雨の30分窓も含めてオフライン再現し、通知の確定原因とは呼ばない。
3. `.limit(100)`、固定雨API URL、同一観測の再カウント、配信/DB間障害、期間外の直リンク、元画像の保持が要検証。
4. 全国のstride2、欠測、実routeとproofの乖離は過去の理由と証拠を保全。成功した限定試験を全国完成へ拡張しない。
5. 依存lockfileがない。既存監査の脆弱性件数・更新候補は当時のartifact値であり、現在のnpm監査結果として転記しない。今回依存更新は実施しない。

## Preview・権限・未反映

Vercel project `prj_LDqpPAqNGDaY4Aaix8ulwPc8oXmu` の存在は取得できたが、明示team/projectでdeploy一覧は403。ローカルvercel CLIなし。従って全deploy/production SHA対応は未確認。全branch HEADのGitHub commit statusと全PR会話コメントを取得し、証拠JSONに保存した。

#63 HEADにはVercel success status（2026-10-20T14:01:08Z、deployment `rcnUQ3mAjdbYfygQLpMNkBbas1u9`）あり。一方PRコメントにはfree-per-day制限による失敗もある。statusの成功は該当SHAの記録であり、過去の失敗がすべて解消した証拠ではない。固定Preview URL/実環境の設定・操作は今回未検証。

旧handoffには巨大文書追記がブロックされた記録がある。GitHubで成功した内容はcommit SHAで確認する。ブロックされたpayloadはGitに存在せず、自動再試行・別経路反映の有無をGitHubのみで完全復元できない。未反映がゼロとは宣言しない。

## 更新運用

作業ごとに台帳へ目的/理由、対象branchと開始SHA、変更path、到達段階、検証run/結果、未確認、阻害点、次の具体操作を記す。commit/push成功後にremote HEADを照合する。保存失敗時は完了と報告しない。main更新後は新基準SHAで全表を再計算し、旧snapshotを残す。mainへのマージ・branch削除・本番操作はユーザー承認が別途必要。
