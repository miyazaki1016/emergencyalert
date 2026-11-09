# 何を作り、何を検証してきたか — 過去作業の入口

**新規着手時は担当AIが依頼文で[自動照合](WORK_HISTORY_PREFLIGHT.md)を実行すること。** 過去のコード・数値・未解決事項を確認し、再利用判断を記録してから進める。手動検索だけで済ませない。

## 日本語開発履歴（コード・検証根拠付き）

[📚 両プロジェクトをスマートフォンで検索](https://miyazaki1016.github.io/misaki/history.html) ／ [全案件・根拠資料](https://github.com/miyazaki1016/emergencyalert/blob/development-history/docs/work-history/README.md) ／ [更新・着手前検索・確度・制約](WORK_HISTORY_OPERATIONS.md)

本文抜粋の既存索引を残し、実コード・差分・テスト・Actions・関連資料を案件単位に整理する履歴を追加しました。重要結論と過去版は保存し、本番反映とは分けて扱います。

> **探す → 証拠を読む → 現状確認** の順で利用する。2026-11-09に原点の見落としを受けて追加。**これは最新の本番稼働一覧ではない。**

## まず見る場所

- **全PR・ブランチの作業内容一覧（自動）**：[GitHub Actions「Development inventory」](https://github.com/miyazaki1016/emergencyalert/actions/workflows/development-inventory.yml) → 最新の成功した定期・手動実行 → **Artifacts: `development-inventory`** → **`work-history.md`**。全PR（open/closed/merged）のタイトルと本文抜粋、PRリンク、ブランチ名、関連PR履歴を検索できる。**毎日の自動更新はmainにこの生成処理が入ってから有効**。成果物保存期間は30日。
- **現在の案件と次の一手**：[開発台帳](DEVELOPMENT_LEDGER.md)。個別案件が完成／本番／実機かは、こちらと実際の証拠を照合。
- **変わらない製品原点・最終像**：[サキくる製品憲章](SAKIKURU_PRODUCT_CHARTER.md)。ここは進捗を消してはならない独立した方針。
- **GitHubの全PR**：[オープン](https://github.com/miyazaki1016/emergencyalert/pulls) ／ [終了・マージ済み](https://github.com/miyazaki1016/emergencyalert/pulls?q=is%3Apr+is%3Aclosed)。詳細な変更ファイル・コメント・履歴を直接検索可能。

## 重要な作業・研究の見取り図

以下は**全文書・全PRの代替ではない**。複数のブランチに分散した成果へ最短でたどり着くための重要な入口。

| 分野 | 過去にどこまで試したか | 原本・証拠 | 判断上の注意 |
| --- | --- | --- | --- |
| サキくるの完成像 | LIVE JAPANを将来のトップページにし、アメふるはその中の雨関連コンテンツ | [製品憲章](SAKIKURU_PRODUCT_CHARTER.md) · [原点保存PR #180](https://github.com/miyazaki1016/emergencyalert/pull/180) | 呼称「サキくる」の正式決定は未確認。完成構想と実装済みは別 |
| LIVE JAPAN | 日本地図・昼夜表現・地域表示・災害情報の優先表示の試作 | [PR #61](https://github.com/miyazaki1016/emergencyalert/pull/61) · [実データ接続計画](https://github.com/miyazaki1016/emergencyalert/blob/feat/live-japan-experience-prototype/docs/LIVE_JAPAN_REAL_DATA_INTEGRATION_PLAN.md) | 公式災害データは未接続の試作 |
| 旧X／旧アメふる | 全国大雨予報とGIF（Twitter表示時MP4化）、他の防災・生活情報の投稿 | [旧X原型](https://x.com/_emergencyalert) · [代表的投稿](https://x.com/_emergencyalert/status/1663129832178487296/photo/1) · [製品憲章](SAKIKURU_PRODUCT_CHARTER.md) | ユーザー提供のGIF ZIPと画像6枚はChatGPT Library `/サキくる原点資料/` に保管。GitHubバイナリではない |
| 全国大雨予報 | z4全国候補→z10詳細、N03市区町村照合、キュー・分割データ・負荷の検証 | [PR #59](https://github.com/miyazaki1016/emergencyalert/pull/59) · [readiness proof](https://github.com/miyazaki1016/emergencyalert/blob/feat/national-heavy-rain-preview/docs/NATIONAL_RAIN_READINESS_PROOF.md) | 本番スケジューラ等の受入条件は未完了。47都道府県原本を保全 |
| **z4の1画素飛ばし検証** | 2026-10-16の実JMA画像6時刻：全画素で30mm/h以上177画素・独立雨域88、stride2は45画素、47雨域を完全見逃し | **[PR #62](https://github.com/miyazaki1016/emergencyalert/pull/62) · [Actions検証ログ](https://github.com/miyazaki1016/emergencyalert/actions/runs/38967793373)** | **z4内の間引き比較**。z4対z10の解像度保証や実降雨的中率ではない |
| z4安全修正 | 全国候補スキャンを stride1へ、欠損タイルを「雨なし」にしない修正案 | [PR #181](https://github.com/miyazaki1016/emergencyalert/pull/181) | PR #59をベースにした未統合の下書き。MY Pushは触らない |
| MYアメふる | 登録地点のz10雨量判定と30/50/80mm/h通知、予測の継続性、通知重複対策 | [開発台帳](DEVELOPMENT_LEDGER.md) · [予測エピソードの検証](FORECAST_EPISODE_FIX_20261029.md) | MYの通知仕様を全国の一覧・30分枠と混同しない |
| MY雨予測の精度研究 | 雨の判定ラボ・予測と実況の照合、観測欠損と予測の時間ずれ調査 | [PR #179](https://github.com/miyazaki1016/emergencyalert/pull/179) · [判定ラボ資料](RAIN_RESEARCH_DASHBOARD_20261029.md) | 検証できた数と対象外数を分ける。未統合研究を本番効果として言わない |
| 防犯情報（独立案件） | JASPIC通知・メール処理の開発と動作確認 | [Issue #154](https://github.com/miyazaki1016/emergencyalert/issues/154) · [PR #155](https://github.com/miyazaki1016/emergencyalert/pull/155) | 雨の通知やLIVE JAPANとは現状別の運用系統 |
| 開発棚卸し | ブランチ／PR／Issueを毎日収集、ファイル差分や重複候補をレビュー、台帳への事実更新提案 | [棚卸し完了条件](INVENTORY_COMPLETION_CRITERIA.md) · [棚卸しActions](https://github.com/miyazaki1016/emergencyalert/actions/workflows/development-inventory.yml) | **従来は主に状態・差分・レビュー候補**。今回はPR説明の横断検索用 `work-history.md` を追加 |

## なぜ前の棚卸しで見つけにくかったのか

従来の棚卸しは、**「どのブランチがある／何が変わった／どのPRがまだ開いている」**を調べるのが得意だった。一方、**「あの実験で具体的に何が分かったか」**は、PRの本文・Actionsログ・別資料を開かないと分からなかった。

今回の自動履歴は、その中間に「**PR本文から作業内容を探す索引**」を追加するもの。**本文冒頭しか自動抜粋しないので、結論と実データは元のPR・ログで確認する**。過去のPR本文に詳細がないと、索引にも出ない。完全な意味理解型の棚卸しだと誤認しない。

## 引継ぎ時の最低手順

1. まずこのファイルの重要実験と、最新の `work-history.md` を検索する。
2. 類似研究があったら当時のPR・コミット・CIログ・証拠ファイルを開く。
3. main、本番、実機の差を確認し、**再実装・再測定が本当に必要なときだけ**新規作業を行う。
4. 新たな重要な結論（見逃し率・負荷限界・プロダクト方針など）は、検索に引っかかる見出しと一次証拠リンクをこの入口にも記録する。
