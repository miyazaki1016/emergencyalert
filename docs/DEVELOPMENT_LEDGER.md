# アメふる 開発台帳

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
