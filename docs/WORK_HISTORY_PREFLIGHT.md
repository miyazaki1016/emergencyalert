# 「それ、前にやってるよ」を着手前に提示する運用

新規実装・調査・修正・再測定の前に、担当AIはユーザーの依頼文をそのまま渡して自動照合する。利用者に検索語を考えてもらわない。履歴を見るよう促すだけで作業を開始しない。

## 通常チャットからの引継ぎ（標準経路）

**引継ぎ先は通常チャットを基本とする。WorkやローカルPythonの実行環境を前提にしない。** Pythonを実行できなくても、GitHub連携でIssueの作成・本文更新とActions結果・ログの読取りができれば、既存のGitHub Actionsに実行を任せられる。

1. 最新mainの `AGENTS.md`、この手順、対象の総覧・台帳をGitHub連携で読む。今回の作業と同じIssueがある場合はそのIssueを再利用し、別案件のIssueは流用しない。
2. 今回の依頼文・目的・守る条件・直前の状況を、対象リポジトリのIssueのタイトルと本文へ登録する。**ソラがGitHub連携で登録し、利用者へPythonやPC操作を求めない。** Issue作成・本文編集で `Existing work preflight (read-only)` が自動起動する。
3. `issues` 起点で作られた実行のSummary、または `preflight` ジョブのログ・`existing-work-preflight` 成果物を読む。出力の依頼文と更新時刻を照合し、今回のIssueに対応する結果か確認する。記録にはIssueのURL・番号とActions実行URLを残す。成功／失敗の色だけで判断しない。
4. `REVIEW_REQUIRED` は原本確認待ち。提示されたコード・数値・検証対象SHA・未統合研究・残課題を読み、各要確認候補の `id`、`decision`（`reuse`／`extend`／`distinct`）、具体的な `reason`、出力に含まれる `evidence` URLを、Issue本文の `history-preflight` ブロックへ記録する。形式は後述のIssue／PR本文の例を使う。
5. **本文の編集後に作成された新しいActions実行**を確認する。古い実行を再実行しただけで最新本文が反映されたとは決めつけない。`REVIEW_RECORDED` なら記録した再利用方針で未解決分のみ進める。`NO_STRONG_MATCH` でもコード・台帳を確認する。`INCOMPLETE`、権限待ち、実行待ち、結果取得不能は照合完了扱いにしない。
6. 後でPRを作る場合は、Issueをリンクし、**PR本文にも**その時点の候補に対する `history-preflight` 判断を記録する。Issueの判断がPRへ自動転記される仕組みはない。PRでは変更パスも照合するため、候補が増えたら追加確認する。

必要なGitHub連携の機能・権限がそのチャットにない場合は、不足する操作を具体的に伝え、実行済みと報告しない。ローカルPythonがないことと、Actions経由でも照合できないことは区別する。既存のマージ・デプロイ・DB・認証・通知送信の許可範囲は引継ぎ後も維持する。Issue登録・本文更新はVercelへのコードpushや本番デプロイではない。自動コメント送信は追加しない。

## 実行環境が使える場合のCLI（任意の経路）

```sh
python3 scripts/development_preflight.py --task '今回の依頼文・目的・変更したい挙動' --paths 対象コードのパス --output /tmp/development-preflight
```

`--paths` は対象が分かる場合に指定する。分からない場合は省略できる。常に最新の `development-history` をfetchし、全PR・未統合研究・作業ブランチ・削除済みブランチの保存済み成果から照合する。変更対象パス、PR番号、日本語と英語の表記揺れ、目的・結論の語句から候補を順位付けする。外部AI API、DB、通知APIを使わない。

## 結果を受け取った担当AIの動作

| 結果／終了コード | 次にすること |
| --- | --- |
| `REVIEW_REQUIRED`／3 | 上位の要確認候補（最大3件）の原本を読み、実装・再測定を始める前に再利用判断を記録する |
| `REVIEW_RECORDED`／0 | 記録した既存成果を起点に、未解決の差分だけを作業する |
| `NO_STRONG_MATCH`／0 | 強い候補なし。通常のコード検索・台帳照合も行う。新規性の保証には使わない |
| `INCOMPLETE`／2 | 履歴未取得・48時間超の更新遅延・収集エラーなど。照合完了扱いにせず棚卸しの復旧・更新を先に行う |

提示する内容は、照合理由、既存の日本語結論と実験数値、コード・PR・検証原本へのリンク、残課題、次の作業、CI対象SHA、main統合状態、本番反映状態。類似度は重複の断定でも実装完了の認定でもない。

例えば「全国の雨雲の候補抽出を軽くしたい。1ピクセルおきに間引いて走査しても大丈夫か比較する」という依頼から、アメふるPR #62を提示し、「88雨域中47雨域を完全見逃し」という既存結論を示す。PR #181の修正案とPR #59の全国処理も一緒に確認し、同じ測定をやり直さない。

## 再利用判断の記録（利用者の承認は不要）

通常チャットではIssue本文の `history-preflight` ブロックへ記録し、本文編集で再照合する（形式は後述）。CLIを使う場合は、原本を読んだ担当AIが次のJSON配列をローカルファイルへ保存し、同じコマンドに `--decisions /tmp/preflight-decisions.json` を追加して再実行する。`id` と `evidence` は今回の出力からコピーする。3種類の判断のいずれかと、具体的な理由が必要。短い「確認済み」だけでは通らない。

```json
[
  {
    "id": "pr-62",
    "decision": "reuse",
    "reason": "47雨域の見逃し実測を再利用し、同じ比較実験は行わず全画素案の未解決条件だけを調べる",
    "evidence": "https://github.com/miyazaki1016/emergencyalert/pull/62"
  }
]
```

`reuse`＝既存成果を再利用、`extend`＝既存成果に不足する条件だけを追加、`distinct`＝原本と比較して別案件と判断。自動処理は原本を読んだか・理由が正しいかの意味までは証明できない。担当AIが根拠と理由の責任を持つ。

## Issue／PRでの自動チェック

`Existing work preflight (read-only)` が、Issue作成・編集・再開、PR作成・編集・コミット更新時に依頼内容を自動照合する。PRは変更パスも自動で読む。根拠を確認する記録が足りなければチェックは失敗し、ActionsのSummaryと `existing-work-preflight` 成果物に候補を残す。IssueではActionsの一覧から結果を確認する。IssueやPRへ自動コメントは送らない。

PR／Issue本文には次の形式で判断を残す。JSON内容自体は依頼文の照合から除く。依頼文を消して照合を通すことや、根拠を読まずに候補を別案件扱いすることは禁止。

```text
<!-- history-preflight
{"decisions":[{"id":"pr-62","decision":"reuse","reason":"47雨域の見逃し実測を再利用し再測定を省略する。全画素案の未解決条件だけを確認する","evidence":"https://github.com/miyazaki1016/emergencyalert/pull/62"}]}
-->
```

Checksの `preflight` → Details → Summary、またはActionsの `Existing work preflight (read-only)` → Summaryを開く。自由な作業文を手動照合する場合はActionsのRun workflowで `task` に入力する。PR作成後のチェックは二重確認であり、着手前の照合（通常チャットはIssue経由、実行環境がある場合はCLI）を代替しない。

ベース側の照合プログラムを実行し、PRのコード・Issue本文はデータとして扱う。読取り権限のみ、8分上限。既存の日次更新・検索画面・承認ボードの役割は維持する。ブランチ保護の設定は変更しないため、チェックを無視するマージまで物理的に禁止するものではない。

## 確度と限界

表記揺れ辞書と語句・コードパスの照合であり、任意の依頼文を理解するLLM解析ではない。未知の表現では候補を逃すことがある。そのため候補なしでも原本・台帳・コード検索を継続する。新しい重要結論は従来どおり日本語履歴に追記する。日次更新はVercelビルドや外部AI料金を使わない。

```sh
python3 -m unittest discover -s tests -p 'test_development_preflight.py' -v
```
