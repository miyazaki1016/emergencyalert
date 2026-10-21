# MYアメふる — Pushクラッシュ・並行実行・通知重複防止の安全性設計

更新: 2026-10-21。対象: PR #63 `feat/my-rain-notification-history-20261019`。
**設計案・オフライン試験のみ。実稼働workerへ未接続、本番DB/Push未変更。NO-GOを維持。**

## なぜ前回の再試行だけでは足りないか

`deliveryFinalization.ts` は、実行中のworkerが存命なら、Push配信後のDB更新を冪等に再試行できる。ただしPush受理の直後にworkerが停止すると、DBは0件pendingのままで結果が失われる。別workerの並行起動では、両方が同じ地点の通知条件を満たし、別々のIDでPushを送ることもある。**IDを採番しただけでは通知の重複防止にならない**。

PushのHTTPレスポンスがタイムアウトすると、先方が受理した可能性がある。期限切れleaseや「応答なし」を送信未実施の証拠として扱い、再送すると重複し得る。Web Push受理もiPhone表示・閲覧の証拠ではない。

## 最低限必要な耐障害契約（提案・未採用）

1. 通知を発行すべきイベントに、監視対象ID・エピソード（境界の根拠）・通知種別・悪化段階等からなる**永続的なidempotency key**を与える。イベント分類の変動やworker再起動で安易に別キーを発行しない。厳密なキー構成は通知評価に基づき決定。
2. DBで `UNIQUE(owner_id,target_id,idempotency_key)` 等を強制し、2 workerの競合をatomic insert/claimで解決する。アプリケーション側のSELECT→INSERTチェックやleaseだけに依存しない。主キー/owner/RLSの実環境制約を照合した上で専用outbox schemaを設計。
3. 通知ID（ユーザーがタップする履歴）と、**購読先単位の送信試行**を別のレコードに分ける。送信先endpointや秘密鍵は監査ログに公開しない。購読の追加・削除は評価時点の対象集合から区別する。
4. 各送信試行を送る**前**に、DBの原子的claim（fencing token付き）を確定。claim済みを別workerが送信してはいけない。単にleaseが切れただけでは「実際には送っていない」と判断しない。
5. 結果を `CREATED → CLAIMED → ACCEPTED | FAILED_TERMINAL | UNCERTAIN` と分類する。Push送信前クラッシュでclaimがまだない `CREATED` だけを安全な再claim候補とする。`CLAIMED` 後に失効・タイムアウト・worker停止なら `UNCERTAIN` に保留、**自動再送しない**。取りこぼしと重複防止のトレードオフを運用者が把握する。
6. `ACCEPTED` を追跡可能にするには送信結果の耐久保存が必要。レスポンスを受け取った後のクラッシュで `UNCERTAIN` のまま残り得る。サーバーで結果を保証できないものは推測で受理扱いにしない。
7. 正確に成功件数を集計できた試行のみ履歴の `delivered_count > 0` に確定し、UIの回答対象にする。曖昧な試行・保留や障害は管理者の監査対象とし、通常の「成功配信履歴」に混ぜない。保留の保存期限・個人情報削除・復旧手順は別途決定。
8. 処理対象全体の最大100地点制限、ページング、watch_states更新、降雨イベント寿命、5分cronの重なりは別の安全性課題。通知の競合制御だけで対応済みとみなさない。

## 今回の試験実装

- `supabase/functions/watch-rain/deliveryAttemptSafety.ts`：**現在のworkerでは未使用の純粋な状態遷移モデル**。送信許可は未claimの `CREATED` のみに限定。二人目のclaim、lease失効、timeout、404/410、受理後の再送、事後に届いた結果を区別する。
- `tests/deliveryAttemptSafety.test.ts`：二重claim、送信後crash、結果不明、成功・失効の再送抑止、未claimへの不正結果、空の送信者ID、遅着結果の8ケースをオフライン検証。
- **これはDB/HTTPの原子性・実際の冪等性を実装・証明するものではない。** 状態遷移が将来のDBプロトコルを満たすか確認するための独立した仕様テスト。

## 故障別の方針と実現状況

| 障害 | 安全側の対応 | 実現状況 |
|---|---|---|
| 2 workerが同じイベントを評価 | DB uniqueキー＋claimで送信権を1件に限定 | **未実装**、オフライン遷移テストのみ |
| pending作成直後、claim前に停止 | 同じイベントIDを再使用・再claim | 未実装 |
| claim後、Push開始前に停止 | 送った証拠がないが、再送してよいと立証できないため保留 | オフライン契約のみ |
| Push受理後、DB更新前に停止 | UNKNOWNに隔離、自動再送禁止、照合可能な証拠を保全 | オフライン契約のみ |
| Web Pushのレスポンスタイムアウト | 受理済みの可能性を認め、UNKNOWN | オフライン契約のみ |
| 404/410の明示応答 | 配信成功0、購読失効処理、同じ試行は再送しない | 本workerにも購読削除ロジックあり。outbox未統合 |
| DBの配送件数更新だけ失敗 | 既存 `deliveryFinalization.ts` が最大3回の絶対値更新・再読込 | ブランチworkerに実装、クラッシュ後復旧は未対応 |
| ユーザーが古いPushをタップ | IDでRLS保護対象を個別取得、見つからないときは案内 | ブランチUIに実装、実機未検証 |

## 本番投入前の追加ゲート

1. イベント/エピソードIDの定義とDB unique制約の設計・承認。
2. 検証用Supabaseで本物のatomic claimを並行実行し、同一通知が二重に送られないことを確認。
3. ローカルHTTPモックによる、タイムアウト・クラッシュ・遅着結果・一部購読のみ成功などの故障注入。
4. ユーザーへの配信件数と認可、経年データ、匿名アカウント切替の確認。
5. iPhone PWAで通知開封→そのIDの履歴→回答保存の一連の実機試験。
6. 手動復旧手順（ログ粒度、アクセス監査、保持期限、未確定レコードの扱い）を決定。
7. 最終的に本番SQL/Edge/Mainはそれぞれ別の明示承認を取得。安全条件が足りなければ公開しない。

参照: `docs/MY_RAIN_DELIVERY_FINALIZATION_CHECKPOINT_20261021.md`、`docs/MY_RAIN_STAGED_ROLLOUT_GATE_20261020.md`、`docs/AMAFURU_CONCEPT.md` （監査ブランチ）。

## 2026-10-21 隔離PostgreSQLでのDB一意制約プロトタイプ

追加した `docs/sql/my-rain-push-outbox-prototype.sql` は、`rain_push_event_claims` の `UNIQUE(owner_id,target_id,event_key)` と `UNIQUE(notification_id)`、`rain_push_subscription_attempts` の `PRIMARY KEY(event_claim_id,subscription_id)`、両テーブルのRLS有効化と非公開GRANTを準備する**提案用SQL**。既存の本番 `notification_deliveries` に追加適用していない。

`tests/sql/push-claim-integration.sql` は使い捨てPostgreSQL上で、二重イベント/送信先claimの抑止、UNCERTAIN後の再claim拒否、authenticated/anonの読み取り禁止を確認する。GitHub CIの `feedback-rls` jobにこのSQL試験を追加した。

**注意**: 同一トランザクション内で順番にINSERTする試験はDBの一意制約とアクセス制御の証拠であって、**二つの独立コネクションが同時にclaimする負荷テストではない**。また event_keyの生成・サーバーでの所有者照合・原子的claim後の送信プロトコル・worker統合・故障時reconciliation・配信成功件数の正確な集約は未実装。ユニーク制約だけでexactly-once Pushを保証したと解釈しない。実環境の事件IDの意味を決めるまでは、このプロトタイプを本番マイグレーションと扱わない。

**CI検証（2026-10-21）**: コミット `4ac1db68` の GitHub Actions run `39549775193` において `feedback-rls`（既存RLS試験＋追加した “Verify unique Push claim prototype in isolated Postgres”）と `verify`（npm test/build）の全ジョブが **success**。ただしこの試験は逐次INSERTであり実並行コネクション/実Push/実Supabase HTTPセッションの検証ではない。
