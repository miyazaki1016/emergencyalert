# 元の目的を見失わない中断・復帰手順

中断や引き継ぎが必要な案件を[開発台帳](DEVELOPMENT_LEDGER.md)に記録する。美咲とアメふるで同じ項目を使用する。アメふるの最初の登録案件は、通知文C案の [Issue #205](https://github.com/miyazaki1016/emergencyalert/issues/205) と、その[実装への引き継ぎ記録](https://github.com/miyazaki1016/emergencyalert/issues/204#issuecomment-6793492527)。

## 担当ソラの手順

1. 既存の着手前照合に合格したら、台帳の `work-resume:v1` チェックポイントを読む。日次棚卸しのSummary／`development-inventory` 成果物に `resume-candidates.md` とJSONもある。通常チャットは台帳だけでも目的と次の一手を読める。
2. 別の不具合へ移る**前**に、元のIssueを `paused` として、`pause_reason`、中断位置（コード・テスト・SHA・資料へのリンク）、次の一手、復帰条件を記録する。不具合は別Issueで扱い、本文に親Issueをリンクする。親の `blocked_by` に子Issue番号を記録する。子Issueを作っただけで元案件を完成扱いしない。
3. 子の修正が終わったら、本当に受入条件を満たしたかを証拠で確認してから子を完了にする。次の日次／手動棚卸しでは、全子Issueが `closed/completed` の親を「再開待ち」と表示する。未取得・削除・not_planned等は「要確認」。再開候補は着手許可でも親の完了でもない。複数の子があれば全件を確認する。
4. 担当AIが元の制約・最新照合結果・復帰条件を確認し、親へ戻る。戻れない場合は理由と次の確認事項を残す。復帰後は親を active に更新し、実際に戻った担当・日時・再開地点・作業証拠を resumed に記録する。保留する場合は理由と review_when に再確認条件を残す。再度中断したら過去の復帰記録をGit履歴に残し、現在のチェックポイントの resumed を外す。
5. 作業終了・チャット引き継ぎ時にも、未完了の親目的が残っていないか確認する。合格待ちや許可範囲のルールをこの手順で迂回しない。

台帳が正本。Issue本文はリンクと文脈、履歴は過去の根拠、生成一覧は現在の再開候補を担う。新しい状態台帳を別ファイルに作らない。チェックポイントの変更履歴はGitで保持し、過去の判断・証拠は削除せず日付付きで追記する。Issue本文を更新した場合は従来どおり最新本文に対する再照合を待つ。

## 正本の項目

`issue` は親Issue番号、`goal` は完成させる目的、`status` は active／paused／review／complete、`updated` は確認日、`pause_reason` は中断理由、`blocked_by` は復帰を妨げている子Issue番号、`next` は中断位置と次の具体的一手、`completion` は完了条件、`evidence` は証拠リンク。子は同一リポジトリのIssueに限る。事実がない依存関係は作らない。手動保留は子なしでも記録できるが、自動的に再開候補へ変えない。

`stages` は implementation（実装）／verification（最新変更の必要な検証）／main（統合）／production（本番反映と実経路）／device（実機）を別々に記録する。状態は unconfirmed／passed／not_applicable。passedや対象外の主張にも根拠を付ける。研究・管理案件の本番や実機は、完了条件に照らして対象外とする理由を記録する。全段階の根拠と受入条件を人が確認するまでcompleteにしない。URLがあるだけでコード内容・CI対象SHA・実デプロイ一致を自動認定しない。

## 生成と確認

```sh
python3 -m unittest discover -s tests -p 'test_development_resume.py' -v
python3 scripts/development_resume.py --live
```

生成処理は既存 `report.json` と台帳を読み、子Issueだけを既存の読取りAPIで確認する。`--live` なしは保存済みスナップショットだけで判定し、未取得の子を完了と推定しない。既存の日次Actionsに組み込み、短期トークンの既存read権限だけを使う。APIキー・外部AI・DB接続は不要。

日次の再開候補表示は、Issue編集や親状態の自動更新をしない。子の終了直後に即時反映するイベント処理は未導入。Actionsの成果物は既存の30日保存、正本はGitに残る。自動書込みは読み取り試行の確認後に別途検討する。

候補生成ステップは追加報告として分離し、失敗しても既存の履歴収集・公開を止めない。候補ファイルがない場合は「再開候補なし」ではなく「生成未確認」と扱い、正本の台帳を読む。

## 担当ソラへ渡す記録

日次棚卸しの `resume-candidates.md` で親Issueの引き継ぎ欄を確認する。次の一手・完了条件・子案件の状態・実際の再開記録・根拠リンクをまとめて参照できる。再開待ちは、台帳に復帰の作業証拠を記録するまで残る。再開日時はタイムゾーン付き、証拠は実際の作業が確認できるHTTPS URLとする。

`resumed` は active の親に記録し、担当を `by`、日時を `at`、再開地点を `from`、作業記録URLを `evidence` に入れる。`review_when` には再確認する条件を書く。

PRのCIを根拠に使うときは、`stages.verification` に `pr`（PR番号）と `head_sha`（検証対象の40桁SHA）を対で記録する。棚卸し時のPR HEADと異なる場合は「最新HEADのCIを再確認」、取得できない場合は「要確認」を表示する。SHAが一致した場合も、CIの結果・本番版・実機動作はそれぞれの原本で確認する。
