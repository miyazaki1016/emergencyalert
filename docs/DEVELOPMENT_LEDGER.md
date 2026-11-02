# アメふる 開発台帳

> **最新の交通整理表**：[開発案件・担当・次の一手の運用索引](DEVELOPMENT_OPERATIONS_INDEX.md)（2026-11-01時点。実装・本番の完了認定ではない）。

[総覧へ戻る](PROJECT_OVERVIEW.md) · [リポジトリ直下の入口](../PROJECT_OVERVIEW.md)

この独立台帳は2026-10-29に作成。過去の開発史・意思決定は既存の[総覧](PROJECT_OVERVIEW.md)に保持し、この台帳で過去の作業を新たに完了扱いにはしない。

## 2026-10-29 通知予測とレーダー実況の自動答え合わせ

### 目的・承認・所在
- 登録地点で新規に送信する「降るよ」「止むよ」の予測根拠を残し、対象時刻の後日実況と自動照合する。予測評価・地上雨量・配信品質は分離。
- ユーザーから本番実装まで明示承認済み。今回の追記は記録とリンクだけで、コード・DB・Push・cronを追加変更しない。
- 元ブランチ：`feat/notification-replay-production-20261029`。実装：[PR #99](https://github.com/miyazaki1016/emergencyalert/pull/99)、main統合コミット：`b6c216be96ecadcb9f86f2042ee6e786800b30c8`。
- 詳細正本：[本番実装・確認記録](NOTIFICATION_REPLAY_PRODUCTION_20261029.md)。設計元：[PR #98](https://github.com/miyazaki1016/emergencyalert/pull/98) の研究ブランチ `research/notification-replay-20261029`。PR #98全体・PR #63全体をmainへ取り込んだわけではない。

### 実装・本番反映済み
- `watch-rain v32`：送信前の位置・入力観測・予測・判断・通知文を独立した不変スナップショットへ保存し、送信結果と既存通知履歴IDを関連付ける。保存失敗で通知を止めず、評価処理からPushを再送しない。
- `evaluate-rain v1`：独立した5分cron、JMA実況解析の回収、降り始めの遷移／終了の持続を評価。ぴったり／±5分／±10分を分離し、欠測は判定不能。
- `rain_notification_evaluations`：90日保持。`rain_evaluation_runs`：30日保持。RLS有効、クライアント権限なし。現行の`delivered_count > 0`制約と通知条件は維持。
- DB移行：`20261029021418_notification_radar_replay.sql` と `20261029022421_notification_radar_replay_schedule.sql`。ソースと移行SQLはmainに保存。

### 確認結果（2026-10-29 11:27 JSTまで）
- ローカル181テスト、本番ビルド、Edgeソースの型チェック成功。隔離SQLで権限・snapshot不変性・claim排他を確認。
- PR #99最終head `626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8` のverify / phase1-feedback-rls / phase1-feedback-httpがすべて成功。
- 11:25の監視定時処理：HTTP200、12地点、CHECK_FAILED=0。11:27の評価定時処理：OK、failures=0。
- 本番EdgeからJMAの37実況フレームを確認し、11:20の実況PNG中心画素を取得。テスト用Pushや通知条件の緩和は行っていない。
- トークンなし呼出しは401。anon/authenticatedからの評価テーブル読取り、anonのclaim実行は不可。

### 未検証・未実装
- 確認時点の新規実通知評価サンプルは0件。自然な実通知から評価確定までの全行程・実機表示・正解率は未検証。テスト成功を予測精度改善の証拠とは扱わない。
- 保存は中心画素。半径1km画像、地上雨量、無通知ケースの見逃し率、利用者向け結果画面は未実装。
- Issue #64のPushクラッシュ／並行実行時の重複防止・復旧は継続。評価workerの排他をPushの排他と混同しない。

### 次の一手
1. 現在の稼働版と[監視用SQL](sql/rain-replay-monitoring.sql)を読み取りで確認し、新規実通知の保存・履歴リンク・実況回収・評価確定を追う。
2. 受理済みの実通知だけを母集団に、確定結果と判定不能を分けて集計する。0件なら精度を算出しない。
3. 点／面比較に必要な半径1km画像保存は、取得経路・境界跨ぎ・可逆性・実容量を検証して別途追加。地上雨量は独立した評価として扱う。

## 2026-10-29 続き：半径1kmの予測・実況画像

- 本番点評価の再照合：11:32 JSTの定時実行もOK、新規実通知の評価レコードは0件。watch-rain v32 / evaluate-rain v1が稼働。精度集計は行わない。
- 次工程の画像保存を専用ブランチ `feat/replay-area-evidence-20261029`・[PR #100](https://github.com/miyazaki1016/emergencyalert/pull/100)で実装し、本番反映・疎通確認まで完了。正本：[半径1km画像保存](RAIN_AREA_EVIDENCE_20261029.md)。
- 独立archive-rain、可逆PNG＋欠測マスクのDB bytea保存、予測／入力実況／後日実況の分離、中心画素一致、元タイルハッシュ、90日保持、32MiBの物理容量停止ゲートを追加。通知処理や点評価ロジックは変更しない。
- 通知後に同じ発表時刻のURLから取得する方式なので、当時の元PNGバイト列とは区別する。元入力snapshotを後から画像で上書きしない。
- ローカル195テスト、隔離SQLの権限・bytea・排他・不変性・cascade検証を実施。本番ビルド・Edge型チェック・初期headのCI全3ジョブも成功。
- 監視：[画像保存用SQL](sql/rain-area-monitoring.sql)。次は本番PROBEのPNG保存往復と定時回収を確認し、実通知の画像が得られたら欠測・中心一致・取得遅延を検証する。

### 続きの本番結果（11:48 JST）
- archive-rain v1、privateなPNG/マスクbytea保存先、毎分cronを反映。watch-rain v32／evaluate-rain v1は継続。
- PROBEで実JMA実況の21×21画素PNGを本番DBへ保存し、読戻しハッシュが一致。雨なし1例はPNG78bytes＋マスク441bytes、メタデータ等は別。
- 11:48 REGULAR定時実行OK、failures/frameErrorsとも0。トークンなし401、一般クライアントからの画像読取り不可。セキュリティ診断の追加はprivate用policyなしのINFOのみ。
- 実通知評価0件のため、予測画像の自然データ保存から後日実況との比較までの全行程・精度は未実証。次は実通知の欠測・中心一致・容量を[画像監視SQL](sql/rain-area-monitoring.sql)で確認する。地上雨量・面予測の採用・見逃し評価・結果画面は未実装。

## 2026-10-29 続き：点・面・併用のシャドー比較

- ユーザーの続行依頼に基づき、`feat/rain-area-shadow-20261029`で通知を変えない並行計算を追加。[詳細正本](RAIN_AREA_SHADOW_20261029.md)、[監視・共通サンプルSQL](sql/rain-shadow-monitoring.sql)。
- 250m／500m／1kmの面積重み付き雨域占有率、強度別比率、欠測・未知色、連結性、中心の穴を保存。正確な画素内位置を使い、穴の画素は変更しない。
- 500mを主に閾値20/40/60%、解除は半分、5分刻み3コマの共通ルールを比較。現行本番の通知エンジンと共通比較用の点候補は別で、既存本番結果を別列に保持。
- 入力画素不一致・有効時刻後回収・粗い解像度・欠測を保留にし、同じ発表時刻・未来の有効時刻・同じ実況中心の共通サンプルだけで比較する。
- 中心実況の一致は地上降雨精度ではない。利用者回答は時刻付きの補助情報としてライブ参照する。無通知サンプルはまだ追加しておらず、見逃し率は算出できない。
- 独立shadow-rain、privateな結果と実行ログ、90日／30日保持、32MiB容量ゲートを追加。Push・点評価・画像回収を変更しない。[PR #101](https://github.com/miyazaki1016/emergencyalert/pull/101)で追跡し、本番反映まで完了。

### シャドー比較の本番結果（12:23 JST）
- shadow-rain v1、private結果・ログ、5分cronを反映。既存の通知・点評価・画像回収のコードとスケジュールは継続。
- 保存済み11:45実実況画像で円の指標を計算しDB保存成功。12:23の自然な定時実行もOK、failures=0。架空の通知／精度サンプルは作っていない。
- 219テスト、ビルド、Edge型、隔離SQL、PR #101初期headのCI全3ジョブ成功。権限と401を確認。
- 実通知比較は0件。中心実況一致・保留・実況欠測を共通分母で照会し、利用者回答も時刻付きで補助確認する。地上での精度改善、無通知ケースの見逃し率、最適閾値は未確定。

## 2026-10-29 開発者専用「雨の判定ラボ」

- ユーザー指定：一般公開予定の履歴とは別画面にする。本番実装は承認済み。
- ブランチ：`feat/rain-comparison-dashboard-20261029`。詳細：[比較画面と権限・検証記録](RAIN_RESEARCH_DASHBOARD_20261029.md)。
- 3方式共通の分母、画像の並列表示、私用の地点確認、処理稼働状況を実装。一般向け履歴と通知条件は維持。
- 233テスト・隔離SQLのRLS／自己昇格拒否／所有者境界／観測制約成功。実機表示は未確認。実通知2件が入り始めたが評価待ちで、精度改善はまだ判断しない。
- PR #102をmain統合（`de9b480293d5db68e3d1497db28f86179dd71c8a`）。本番DB移行・確認済みPWA 1件の権限付与・Production READY・専用URL HTTP200を確認。CI全3ジョブ成功。非許可者は研究データ0件、anonは研究読書き不可。詳細資料へ証拠・未解決・次工程を追記済み。

## 2026-10-29 美深町 実通知538・539の監査

- 詳細：[監査記録](BIFUKA_NOTIFICATION_AUDIT_20261029.md)。ブランチ：`audit/bifuka-notifications-538-539-20261029`。
- 26保存画像のhash・発表／有効時刻・地点・入力中心14点・面積を再計算。13:10実況は中心弱雨、円内占有率約98/65/29%。透明と未知色・未取得の混同なし。
- 当時の画像全体は未保存のため同一性は証明できない。画面で限界と中心RGBA、実況側の内訳を明示する。
- 13:23に両件の実況・画像・比較すべてCOMPLETE。claimは538=5/18/5、539=4/15/4。地上正解は未確認。
- 再通知は3回目の新しい雨なし実況によるepisodeClosedが、ACTIONABLE継続中にも送信済みを無効化する現行条件。予測通知エピソードを分離する等の修正案を詳細へ記録。既存通知条件は変更しない。
- 235テスト・本番ビルド成功。例外ルート／容量制限でPENDINGが残る可能性、弱雨開始と生活行動閾値の評価の意味の差は残課題。追加UIの実機確認は未完了。

### 続き：不一致の分類と理由表示
- 同じ監査PR #103へ、不一致／保留のパターン別ケース数、各ケースの具体的な時刻・雨量区分・占有率・差分・前提を追加。
- 雨の有無、開始／終了時刻、強さ、範囲、点と面、地点確認との違い、評価基準と欠測を区別。1ケース複数分類・保留別扱い。
- 539の早い弱雨開始と強度差を回帰試験。隣接時刻の欠測・未来・誤った実況発表・矛盾・取消・近隣参考を正解にしない試験を含め247テスト成功。通知条件は変更しない。
- 詳細は[監査記録の続き](BIFUKA_NOTIFICATION_AUDIT_20261029.md)。追加UIの目視・実機操作は未確認。

- 反映結果：PR #103をmain統合（`f65f826d7fab4cd507f048614ccdbe007f6514b7`）。本番READY・専用ページHTTP200確認。最終headのCI全3ジョブ成功、538・539の実記録に説明関数を適用する確認も成功。証拠は詳細と[実記録からの説明](evidence/BIFUKA_538_539_EXPLANATIONS_20261029.json)へ保存。通知・DB変更なし。実機の追加表示確認は未完了。

## 2026-10-29 予測通知の重複修正（538〜548の続き）
- [詳細・検証・再開地点](FORECAST_EPISODE_FIX_20261029.md)。branch `fix/forecast-notification-episodes-20261029`。
- main・watch-rain v32・PR #103監査・PR #93/63の既存研究を確認。現況雨なしで接近予測の通知済みが解除される9件と、並行実行のリスクを分離。
- 予測が完全DRYの新しい発表3回でのみ解消し、新しい接近を再通知可能にする。強雨は別段階の通知キー。購読別の永続intentとfenced target leaseを追加。既存履歴やCHECKは維持。
- 538〜548には共通レーダー45コマ／現地正解0件。ラボの既存比較を維持し、共通コマに入らない理由を可視化。無通知見逃し率は次工程の設計に留める。
- PR #103の539表示はユーザー実機確認済み。追加除外欄の実機確認、CI、本番結果は詳細へ追記。

- PR #104 main統合、DB追加移行・watch-rain v33反映。17:10の自然cron14地点エラー0、全lease解放、既存履歴維持。269テスト・独立Postgres競合を含むCI全4ジョブ成功。
- 初期移行の「新しい接近と同時に起動」「直前に2回解消確認済み」の境界を追加補正し、271テスト成功。別ブランチ `fix/forecast-bootstrap-20261029` で追跡。本番結果・未確認は詳細へ追記。

- 最終：PR #105の移行補強を含むwatch-rain v34へ反映。272テスト・CI全4ジョブ成功。17:20自然cron14地点エラー0、lease全解放、ACCEPTED intent2件・未確定0、対象履歴11行維持。必要な自然通知552は購読別に各1回。
- 観測中に継続ACTIONABLEの抑止対象がないため、実環境での重複減少効果・新たな再接近・強雨悪化の自然事例は継続確認。既存実装を作り直さず、比較元・共通母数を維持。詳細と読み取り専用監視SQLを総覧から辿れる。

## 2026-11-01 作業単位索引（既存証拠を再利用）

> 詳細本文は削除・要約置換しない。以下は美咲と同じID／状態／所在／証拠／main・本番・DB・実機／未確認／次の一手／更新日の入口。詳細照合は `docs/audits/DEVELOPMENT_INVENTORY_DIFF_20261101.md`。

| ID・作業 | 状態 | 所在・確認証拠（2026-11-01） | main / 本番 / DB / 実機 | 未確認・次の一手 |
| --- | --- | --- | --- | --- |
| A-REPLAY-01 通知予測と実況の自動照合 | A（main統合確認） | PR #99 merged、`b6c216be96ecadcb9f86f2042ee6e786800b30c8`。上記既存本文に2026-10-29の本番定時処理・DB移行・テスト記録あり | 統合済 / **過去の本番反映・稼働記録あり** / **過去のDB移行記録あり** / 実機未確認 | 現在の稼働状態と自然な通知→評価確定を追加確認。過去の証拠を再監査しない |
| A-SEVERE-01 大雨予測継続性研究 | C | `research/severe-rain-consistency-20261101`、PR #109 open Draft、研究関数・テスト・設計文書 | 未統合PR / 未確認 / 未確認 / 未確認 | 研究を通知判定に採用したとみなさない。採用前に実測と承認 |
| A-SEVERE-02 強雨通知エピソード制御 | B/C暫定 | `fix/severe-once-per-episode-20261031`、watch-rain・テストのブランチ差分 | 要照合 / 未確認 / 未確認 / 未確認 | mainと最新本番の実体を確認 |
| A-EPISODE-01 予測エピソード初期化修正 | B/C暫定 | `fix/forecast-bootstrap-20261029`、watch-rain・テスト・資料のブランチ差分 | 要照合 / 未確認 / 未確認 / 未確認 | A-SEVERE-02と同じファイルの変更があるため重複整理 |
| A-PUSH-01 Push並行実行・永続claim | D（監査） | `audit/push-concurrency-20261026`、PR #63 open Draft、監査文書 | 未確認 / 未確認 / 未確認 / 未確認 | 旧監査の指摘を現行本番の未修正と断定せず、PR #63のDB制約と現行workerを照合 |

※ 状態B/Cは作業群の暫定分類。未確認は未実施の意味ではない。管理用PR #107は別管理。


## 2026-11-01 棚卸し・ブランチ差分調査
- [調査証拠・判断・未解決事項](audits/INVENTORY_RECONCILIATION_20261101.md)（GitHub/本番DBの読み取り確認。アプリ・DB・Push・本番変更なし）。


## 2026-11-01 旧監査ブランチの追加照合
- [旧監査ブランチの証拠・未確認事項](audits/LEGACY_AUDIT_FOLLOWUP_20261101.md)。過去snapshotと現行状態を区別し、旧ブランチは未削除・未merge。


## 2026-11-01 未整理ブランチの一次分類
- [PR履歴未紐付けブランチの保全・照合・整理候補分類](audits/BRANCH_TRIAGE_20261101.md)。削除やコード取り込みの承認ではない。


## 2026-11-01 機能単位の追加照合
- [mainと旧ブランチの実ファイル照合](audits/FEATURE_RECONCILIATION_20261101.md)（アメふる旧履歴Deep Linkのmain実装を再確認。過去の暫定懸念を訂正）。


## 2026-11-01 旧実験コードの照合
- [旧実験コードとmainの比較記録](audits/LEGACY_CODE_DIFF_20261101.md)。実装採用・DB変更は別途判断。


## 2026-11-01 旧通知回帰テストの追加照合
- [旧通知テストのケース単位照合](audits/TEST_CASE_RECONCILIATION_20261101.md)。10/29重複通知再現は既存、30分境界などは現行テストと継続照合。


## 2026-11-01 現行処理経路の追加確認
- [現行コード経路の静的調査](audits/FORECAST_HORIZON_20261101.md)。コード・DB・本番環境は無変更。

<!-- INVENTORY_FACTS_START -->
## GitHub自動取得の事実（確認用）

> この欄はPRメタデータの記録であり、開発完了・本番反映の認定ではありません。

| PR | タイトル | 状態 | head SHA | 更新日時 |
| --- | --- | --- | --- | --- |
| #1 | Verify seven JMA PNG bands; withdraw unsupported yellow mapping | merged | `891318d7026f1c90209341a48c38ec8df0d879e8` | 2026-09-23T10:42:16Z |
| #2 | feat: add PWA foundation for iPhone and Android | merged | `3618081f7307ad4690021a345e72411bb41c9cbc` | 2026-09-23T17:05:04Z |
| #3 | fix: add PWA install icons | merged | `bb6c7ae27a4bf1cbb6e1e0d60f9c1630f9f6080f` | 2026-09-23T22:41:40Z |
| #4 | fix: improve Japanese address search normalization | merged | `9f6b368065bd575bb4c9de753b40bad8cd1ae2d3` | 2026-09-23T23:13:48Z |
| #5 | feat: support Japanese street address search | merged | `48f712e77622b5a4969fb8eb6ad8629e4e7b9a13` | 2026-09-23T23:36:16Z |
| #6 | feat: allow deleting watch targets | merged | `a2c4c5970436745d8fef1ce2cefe64b2984e2d3a` | 2026-09-23T23:26:27Z |
| #7 | fix: route Japanese numeric addresses to address normalizer | merged | `1896f541792a3bffa860d66cc02413e27b50346d` | 2026-09-23T23:43:07Z |
| #8 | feat: add web push subscription flow | merged | `8b845d1d4cd51dec313abf5d27c21ac501a66a9c` | 2026-09-24T04:36:50Z |
| #9 | feat: make watch ON/OFF state visually clear | merged | `1b5649b6d7a57d501b2d4f57f600f6ab45d69c27` | 2026-09-24T04:17:19Z |
| #10 | chore: add authenticated push test button | merged | `9ea4e2e986a4864a25f8d713593ce685483b148b` | 2026-09-24T05:25:17Z |
| #11 | fix: avoid false push test failure status | merged | `55c57d4d2a83d53ec341bc176a2638ad826abd10` | 2026-09-24T05:34:35Z |
| #12 | test: cover actionable rain notification boundary | merged | `2f7c0aa1109a5a81cc404d8bb69c3a98ff3fd2de` | 2026-09-24T06:03:16Z |
| #13 | test: cover watch-rain notification decision | merged | `9ef39b430206d362852116d7cab9c2daa9f8c897` | 2026-09-24T07:07:35Z |
| #14 | chore: remove temporary push test UI | merged | `604eeeab1ef39e701a7c133613bb8ff10b7224b5` | 2026-09-24T07:11:00Z |
| #15 | fix: resubscribe when VAPID key changes | merged | `9f182608fb0dfe8dc56129f8938bb745cb893ec2` | 2026-09-24T07:29:39Z |
| #16 | chore: source-control production watch-rain | merged | `0aac1241eb6852512f6a03b788f4d85df14e9881` | 2026-09-24T11:13:14Z |
| #17 | refactor: test production watch notification decision | merged | `d1146ef7a2a82685f519d7f69d60cebac325db9f` | 2026-09-24T11:20:04Z |
| #18 | fix: clear place search after registration | merged | `e5408f5823004ab67f4d0a191d052d8131fe2a0a` | 2026-09-24T11:45:21Z |
| #19 | docs: define living emergency and laundry alert direction | merged | `80d09c1bcd31ff5c5c3fb82daead0bd92220cde5` | 2026-09-24T13:58:46Z |
| #20 | feat: add early rain forecast provider | merged | `03e4d17c5ed6660517b7c970ff0bceeb4ab42c31` | 2026-09-24T14:27:03Z |
| #21 | feat: expose early rain forecast prototype API | closed | `6dca8cedc99d2e468cc1d1bbf86a03f1f82bb739` | 2026-09-24T15:51:44Z |
| #22 | fix: clear place search UI after registration | merged | `0c6e8e182d78c9dda143ce4dfed807a0b0291aea` | 2026-09-24T15:44:45Z |
| #23 | feat: expose early rain forecast prototype API | merged | `99df471a5c30908e4925def8a2463ff37af6dff2` | 2026-09-24T15:53:27Z |
| #24 | test: cover early rain prototype API | merged | `0d9bea1c83478b525faddc73628e320bb430f1ae` | 2026-09-24T16:04:30Z |
| #25 | test: verify live JMA early rain data in CI | open | `55174d5c0de802fa06ada23b6ce77aab8840bf6a` | 2026-09-24T23:49:53Z |
| #26 | Use targetTimes member in JMA early forecast tile URL | merged | `3e21ed4d4dacb2cc4827a9560f407a81fee8e273` | 2026-09-24T23:09:13Z |
| #27 | Restore push notification status after reopening app | merged | `c4559c3d7037081cf468f0a34ac6f1e3b7d87ab1` | 2026-09-25T13:42:40Z |
| #28 | Refine persistent light-rain notification boundary | merged | `46b2540bcc07f94909554598857c04a77b7e5d4f` | 2026-09-25T18:52:50Z |
| #29 | Prevent duplicate watch target registration | merged | `9e6fbd0bb0f4f7d2a09777029d4ae9df2c6d3126` | 2026-09-25T19:07:58Z |
| #30 | Deduplicate place search results | merged | `c4182df79a20538e5671d4c6f5ee82172657cbec` | 2026-09-25T19:15:01Z |
| #31 | Add rain interpretation diagnostics | merged | `b16284fe889f2d89b4db03922544cec661b041a0` | 2026-09-25T21:22:00Z |
| #32 | Log withheld rain diagnostics | merged | `43e869da7fb4d1199fb1074d39b0648cc8a28115` | 2026-09-25T21:36:49Z |
| #33 | Fix transparent JMA pixels blocking dry/ending states | merged | `abbc724ff4cf8f4a1ac91b9451e4a2c92390f241` | 2026-09-27T07:25:34Z |
| #34 | Add forecast-frame rain diagnostics | merged | `b3aa42f4af3e71177c980c28d8fed6888449fe81` | 2026-09-27T08:26:27Z |
| #35 | Fix dry forecast boundary at cron tick | merged | `cce27a99441eda5c4e365e6a43e1d73f5c29042a` | 2026-09-27T09:29:08Z |
| #36 | Add today's latest delivered alerts | merged | `169687f70bba6751ebcb1275d0fc22025bca3fc4` | 2026-09-27T10:23:25Z |
| #37 | Confirm observed rain facts after three checks | merged | `bdd80a9fcacf9a52e669637ba154ca3d2665a43e` | 2026-09-27T14:01:20Z |
| #38 | Add severe rain forecast alert layer | merged | `0209250144e4823828a21e383d3e16f0779c3a8f` | 2026-09-27T14:17:23Z |
| #39 | Make rain notifications context-aware | merged | `5546d14114b325dbf08f1a56bf704eb3563b95fa` | 2026-09-27T14:39:48Z |
| #40 | Keep short rain gaps in the same episode | merged | `f313a57807625e7d52b8327b24c9b42affeb510b` | 2026-09-28T00:42:46Z |
| #41 | Keep rain check prompt and button together | merged | `541fb0efee0c012d1278b79427a07c2f63fa607f` | 2026-09-28T00:46:45Z |
| #42 | Refresh EmergencyAlert mobile design | merged | `8f089270f4b7129dc26191fcbda0e2c09b2ea924` | 2026-09-28T01:18:11Z |
| #43 | Lighten rain-blue visual theme | merged | `e2f1953e5c79150a4194051c6bf075dac9aa4634` | 2026-09-28T01:25:27Z |
| #44 | Lighten blue theme and move rain result above alerts | merged | `ec1a36d0e845a3325cdd3f214016e850f2217db3` | 2026-09-28T01:56:13Z |
| #45 | Restore visual hierarchy on light blue theme | merged | `fd3e947e8cfbf2a9ae321fa609880fe280145b89` | 2026-09-28T02:37:41Z |
| #46 | Brighten secondary text for clearer hierarchy | merged | `33dd975c25f1349cdddb9f74544ea0178208d08a` | 2026-09-28T02:46:49Z |
| #47 | Recognize verified JMA 20–30 mm/h PNG color | merged | `d5b55236272f7e66991085807097d42e19fa86bd` | 2026-09-28T03:14:44Z |
| #48 | Disambiguate duplicate notification labels with place names | merged | `52679eb38b4c2b7d66099fba4c1b96ae353cd873` | 2026-09-28T03:43:16Z |
| #49 | Refresh latest alerts at Tokyo midnight | merged | `016ae329333a3a823e5ac978bbdf82a116b6ddf6` | 2026-09-28T03:55:06Z |
| #50 | Keep confirmed rain internal instead of pushing it | merged | `5bc1fef04789de21dbc72845497cb72131baeabd` | 2026-09-28T04:02:51Z |
| #51 | Update project overview from code, DB, and production state | merged | `fb9cb07f113cbf261f18668a3c6378e38f7782ba` | 2026-09-28T04:22:33Z |
| #52 | Track rain confirmation independently of push delivery | merged | `e6ca196570dff62d67060e9b543cd550ebe13b03` | 2026-09-28T04:29:39Z |
| #53 | Restore rain-ending notification decision | merged | `aaddee5d3f3c1c4584c5914bfea95669b5ad17d5` | 2026-09-28T04:51:06Z |
| #54 | Add coordinate-based map location registration | merged | `d89eae23df95c39b04e71c6d88ef7746f6661d0d` | 2026-09-28T05:15:26Z |
| #55 | Show map preview for coordinate picker | merged | `49982078e21a9b630b4a7c60fffe4370f3df48de` | 2026-09-28T05:52:20Z |
| #56 | Overlay current JMA rain radar on map picker | merged | `3f128221d0721ebf2af3d3823506135dfe6839f0` | 2026-09-28T07:41:12Z |
| #57 | Suppress duplicate rain-ending alerts after transient rain | merged | `a1717e0f68ca8b926ae725195d7cb65643d9256d` | 2026-09-28T09:02:02Z |
| #58 | Reduce repeated rain-ending notifications | merged | `b79e743ed449d8c42d6ada42b04c9e551c6c7ba6` | 2026-09-28T22:11:24Z |
| #59 | Add nationwide heavy-rain scan proof | open | `0f5ec30e20bf53f470cdff621f31436a6d52a992` | 2026-10-16T00:48:24Z |
| #60 | docs: 美咲との気象・防災連携契約案（未実装） | open | `6d86d7a83ef17911abb5ebd57e190c690d08709d` | 2026-10-16T00:12:21Z |
| #61 | feat: LIVE JAPAN 生きている日本列島の体験試作 | open | `19fc21c247b934490dbc6f7c104dfc2cea233eb4` | 2026-10-16T06:51:44Z |
| #62 | test: measure real JMA Z4 stride-2 missed rain regions (read-only) | open | `e746d022179a99daa2d16b2d31542aaa41f95698` | 2026-10-16T21:13:32Z |
| #63 | WIP: MYアメふる通知履歴・実天気フィードバック・判定根拠（検証用） | open | `784173985f676dc7f06d7a81275750e0ad07464e` | 2026-10-21T06:54:15Z |
| #65 | Draft: MYアメふる通知フィードバック第1段階（既存Push変更なし） | merged | `3d214ffe6efde4b4a3a29baab93875acddedaf3f` | 2026-10-21T11:29:56Z |
| #66 | fix: iPhone通知履歴を最新2件だけ表示し、古い通知は展開式に | merged | `52e10294c2f10f14368ba31545c0362ad4f85c35` | 2026-10-21T11:37:41Z |
| #68 | feat: 通知履歴をタップで開く短いカードに改善 | merged | `0fb67d23199810a3b1634c964118d88a82b456ce` | 2026-10-21T22:54:25Z |
| #69 | feat: feedback observation summary | merged | `82afd04f7bfa636f7a1a3d70e37d5567d917d712` | 2026-10-22T00:02:00Z |
| #71 | feat: optional eyewitness observation time for rain notification feedback | merged | `d7efe03e23f4b8bbb0e95f1de701a08f8fb38223` | 2026-10-22T05:39:34Z |
| #72 | feat: reversible notification history screen reset without deleting DB rows | merged | `cec25ea8a0b7a596f91722b5b7b5c93d7630b15e` | 2026-10-22T08:25:49Z |
| #73 | fix: retained notification history stays viewable beyond seven days | open | `fb1d1a3f9f0cee3985fffa1831dc52b187c182b3` | 2026-10-22T23:31:22Z |
| #74 | fix: empty notification history guidance after archive | merged | `f95768b0ce31cfaa3d4c1da1d5a20b0a4d937507` | 2026-10-22T23:33:20Z |
| #75 | docs: アメふる全経緯・現状・次チャット向け総覧引継ぎ（2026-10-23） | merged | `cbd475b426a0cab75c325b29fa928048c374cb97` | 2026-10-22T23:51:33Z |
| #76 | [Research/Draft] Diagnose iPhone PWA feedback disappearance on resume | merged | `b641fb38a6341b56fa72af5abafb41634a04a1fb` | 2026-10-23T17:00:21Z |
| #77 | feat: enable PWA diagnostics from in-app toggle | merged | `c4521382847b9df0effcced360d3748dea7de533` | 2026-10-23T17:29:06Z |
| #78 | feat: read-only check of PWA push registration ownership | merged | `14294fbf960c5dd0bc38e81c96904faa194ab38f` | 2026-10-23T18:01:37Z |
| #79 | feat: safe opt-in repair of existing push subscription ownership | merged | `017d3f893e29c8fa0f3655716f9ef33d8fa32b77` | 2026-10-23T18:08:38Z |
| #80 | fix: stabilize anonymous auth client across PWA resume | merged | `cc49a7c789f2bb32642ce77e198df2b1b9d35cc2` | 2026-10-23T18:37:22Z |
| #81 | diagnostics: show presence of PWA auth storage key safely | merged | `61d9a8303b0004c77b13327ca1c759e20b5bf9ae` | 2026-10-23T18:49:47Z |
| #82 | diagnostics: distinguish missing Supabase key from storage-key mismatch | merged | `dc4aad7fb2332816d5c90c58b9cd4eaac77bc161` | 2026-10-23T18:54:37Z |
| #83 | diagnostics: compare Safari authenticated ID prefix without exposing tokens | merged | `1d2775ab26e9491b75488fa9589ced55c3b2af52` | 2026-10-23T19:13:43Z |
| #84 | docs: preserve PWA auth-loss code audit and investigation boundaries | merged | `730af73ecd9e8d15a03d39a54d0cdb5194671e12` | 2026-10-23T19:41:39Z |
| #85 | feat: opt-in local auth storage transition journal for iPhone PWA | merged | `1374fdb3c6f9fdce9778ca8bd3a271ddea57de31` | 2026-10-23T19:45:00Z |
| #86 | Add read-only storage key diagnostics | merged | `019cbbf62bb167f667e1cd5ac43903508864180f` | 2026-10-23T21:08:06Z |
| #87 | Persist opt-in auth key journal across PWA restarts | merged | `6beef3d20e7153ea212848fa57b75d6257cc4c07` | 2026-10-23T21:18:59Z |
| #88 | docs: 通常雨通知の見直し仕様と検証条件 | open | `7b4eddab9380af6b855fbfd654a6ae510517e779` | 2026-10-26T01:38:15Z |
| #89 | fix: 通常雨通知の重複抑制と5〜10mm連続予測判定 | merged | `0b057730aaf055b3a25f467e60f3d413b7f1290f` | 2026-10-26T01:45:26Z |
| #90 | docs: 通知過多対策の本番反映結果と残課題を総覧に追記 | merged | `e014009d9a669ef57c4c76185d27d490e10260c4` | 2026-10-26T01:49:09Z |
| #91 | feat: 30mm/h大雨通知を単一閾値に統一・通知アイコン導入 | merged | `926022d4d8fb849c6dd0e9c909499d87195831f9` | 2026-10-26T04:30:52Z |
| #92 | docs: アメふる精度最優先の開発順序を総覧へ登録 | merged | `210d708d31fe940afbccf0f82cf55ad02057daf0` | 2026-10-26T04:52:00Z |
| #93 | WIP: 通知重複防止・配信整合性の第1優先監査 | open | `a0a4cc891065a52333c7aaca8b93193d8cb7c2d9` | 2026-10-27T19:02:36Z |
| #94 | docs: 降るよ最優先の製品方針と研究所在を総覧へ | open | `9657b86fc02a76946dd2f5e2db1a3c8cdf658d77` | 2026-10-27T19:03:12Z |
| #95 | 設計: 前回通知を踏まえた雨接近メッセージ | open | `1e39976d58c78f287020956c800b356774209752` | 2026-10-27T19:08:37Z |
| #96 | 外部AIレビュー用の安全な静的ページ（プレビュー専用） | open | `f9fe24bf2f74c82096017b809c02e2d925b5db3f` | 2026-10-28T13:04:49Z |
| #97 | Preview only: 外部AIレビュー用の公開総覧 | open | `713eca9ebee4587f8653ac8a80a8ef99e07210cd` | 2026-10-28T13:14:12Z |
| #98 | 研究: 通知予測と実況の自動答え合わせ基盤 設計 | open | `79b4bae479f9b39f48d9fbf0d1745944a3442804` | 2026-10-28T16:57:35Z |
| #99 | 通知予測の本番記録とレーダー実況の自動照合を追加 | merged | `626c66338dbb81f8ea1b4ccc1bb7487b89a31cf8` | 2026-10-29T02:29:53Z |
| #100 | 通知地点の半径1km予測・実況画像を独立保存 | merged | `4b0cd60ba63b77bd7241520d2024cda7e1f15792` | 2026-10-29T02:51:11Z |
| #101 | 点・面・併用の雨判定をシャドー比較 | merged | `87320a16e3f9f04884a3cc2591ab47b43a3c230b` | 2026-10-29T03:28:30Z |
| #102 | 開発者専用の雨判定比較ラボを追加 | merged | `128791dc03bb3e3d8bd7f4698fc275a1017e7a14` | 2026-10-29T04:06:58Z |
| #103 | 実通知538・539の監査と、不一致パターン・具体的理由の表示 | merged | `c23715472dfe8733adddbdcac91d6aa9d7d0b58a` | 2026-10-29T07:34:10Z |
| #104 | 雨なし現況で継続中の接近予測を再通知しない・購読別の送信権を永続化 | merged | `03ba9cc8d5209ea281b7d5409d91d6dd79606a9d` | 2026-10-29T08:07:51Z |
| #105 | 予測通知の初期移行で直前の解消確認を正しく引き継ぐ | merged | `326f6d92485e0e158afcd62db5b37131e11dfc51` | 2026-10-29T08:23:10Z |
| #107 | chore: 読み取り専用の開発忘れ物検出（両プロジェクト共通方式） | merged | `bd03ccc3b96855cfbba2b74409668ce206964f5c` | 2026-10-31T20:12:51Z |
| #108 | 大雨通知をエピソード1回に制限し、30mm/h自動評価を追加 | merged | `9970fad666c6d863c8a9cf17044e141b85bb2596` | 2026-10-31T10:01:58Z |
| #109 | 研究用: 大雨予測の継続性判定（通知ロジック非接続） | open | `d0a684a0cc9cd3f1ac7f5cdbad6bb063c3fa4685` | 2026-11-01T15:17:13Z |
| #110 | docs: 2026-11-01棚卸し・調査結果を台帳へ保存 | merged | `b2ddc796abf2834b549f2c1056d204747e818535` | 2026-10-31T21:24:23Z |
| #111 | docs: 旧監査ブランチの追加調査を台帳へ記録 | merged | `5b1d48d44666ccee5e845bb5cf0689379c42bd8d` | 2026-10-31T21:28:05Z |
| #112 | docs: 未整理ブランチの保全・照合・整理候補を分類 | merged | `aee1b209c7f9dcc1e5803ec912ac72960d8fa237` | 2026-10-31T21:31:02Z |
| #113 | docs: 旧ブランチとmainの機能単位照合を記録 | merged | `566a02c5d5232ab4d47d310e8866de71c142074d` | 2026-10-31T21:40:21Z |
| #114 | docs: 旧実験コードのmain照合記録 | merged | `35727866365a69ce55aaa26313accdf019691ad8` | 2026-10-31T23:06:44Z |
| #115 | docs: 旧テスト・計測コードのmain照合を記録 | merged | `56cccb600dff30c43bc362140c28b31e5272c047` | 2026-10-31T23:11:15Z |
| #116 | docs: 開発台帳に旧テスト照合記録を追加 | merged | `8854cb0c96d77d6c1d7a26378ad7be24c22bf585` | 2026-10-31T23:13:55Z |
| #117 | docs: 現行処理経路と旧実験の追加照合 | merged | `aebac8a57a5dd0202ff4e5780d397d91c090cee3` | 2026-10-31T23:33:38Z |
| #118 | Run read-only development inventory daily at 10:17 JST | merged | `fed609ad6778c8214a7a7bdd43fb84cce4e73298` | 2026-10-31T23:45:29Z |
| #119 | Correct main overview inventory status and daily schedule | merged | `a0fa21fa71c7ef2ae19dbc201a121445470afebc` | 2026-10-31T23:49:08Z |
| #120 | Add concise development operations index linked from ledger | merged | `3eb68f2de6e08348f4896548b9ead204f4a02a74` | 2026-10-31T23:57:47Z |
| #121 | Document inventory delta review and ledger update procedure | merged | `f692324806ded5ce7945f3630be70e083df08b88` | 2026-11-01T00:01:32Z |
| #122 | Generate daily read-only inventory delta and ledger update candidates | merged | `d1e2f50c677432a42852e0c03ccd05d4f3353f31` | 2026-11-01T00:04:39Z |
| #123 | Allow read-only access to previous inventory Actions artifacts | merged | `ba96859f6486975e40e4ee9eb67e48b5210e5280` | 2026-11-01T04:57:32Z |
| #124 | Preserve daily inventory when prior artifact returns HTTP 401 | merged | `d1a53b526f16c838c6a72ee24ffa7d8b3c495459` | 2026-11-01T05:01:47Z |
| #125 | Diagnose HTTP 401 during inventory artifact comparison | merged | `112eb50002512097281e59fca830caf1b7ec651b` | 2026-11-01T05:18:58Z |
| #126 | Inventory phase 2: read-only triage and ledger review proposals | merged | `ae828fb24b911bfa22e84fc057b0cb6b17902020` | 2026-11-01T05:35:43Z |
| #127 | Fix malformed JSON and markdown in inventory triage artifacts | merged | `0cb3954f8558cab23ab0dcf2d9c29c77dcd46acc` | 2026-11-01T09:46:15Z |
| #128 | Inventory phase 3: use PR metadata for review-only case hints | merged | `44d3fc79beb82518fb70917603214aa51aa39323` | 2026-11-01T12:59:25Z |
| #129 | Inventory phase 3: bounded PR file evidence and maintenance triage | merged | `93caab4a85c511a9793d5720beb8164c92e5fe68` | 2026-11-01T13:07:40Z |
| #130 | Phase 4: establish safe ledger automation boundaries | merged | `55f2f23cb622f4f23d9239b6297bda54b8aa5948` | 2026-11-01T14:51:31Z |
| #131 | Phase 4: scheduled review-only ledger update PRs | merged | `aa4937ca3b0dbf48aa7aff13642113b11fffa386` | 2026-11-01T14:54:28Z |
| #132 | Fix ledger facts table columns before first scheduled run | merged | `072ddf684b21c2a9e4f10fc0aefd93a75f7c70b3` | 2026-11-01T14:57:31Z |
| #133 | Event-driven factual ledger proposals on PR changes and main updates | merged | `6d1d873258c7d8a964b6f6aada2aac2c5fbfe26e` | 2026-11-01T15:12:22Z |
| #134 | Add fail-closed checks before ledger automation writes | merged | `ca36d09279b46518c1b4f97868927e4b4b2dad2f` | 2026-11-01T22:46:24Z |
| #135 | Add diagnostic artifact and explicit permission error for ledger automation | merged | `55403d4a586f4da5af06eab9732551d171f1550b` | 2026-11-01T23:22:08Z |
| #136 | Fix inventory CI AttributeError when branch SHA is a string | merged | `19177b8c39ffc8d007b066e175be0d71afd6e760` | 2026-11-02T01:57:31Z |
<!-- INVENTORY_FACTS_END -->
