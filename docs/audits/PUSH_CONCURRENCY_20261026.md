# 通知安定化・重複防止：2026-10-26 第1優先の再開監査

## 確認した現状
- Issue #64 はopen。過去の「後日保留」からユーザーの2026-10-26決定で第1優先へ変更。
- PR #63 は未統合。pendingレコード案は本番の delivered_count > 0 CHECK と不整合のため直接マージ禁止。
- mainの watch-rain/index.ts は watch_states読取 → Push送信 → notification_deliveries insert → watch_states upsert の順。
- 同一targetへの並行cronを防ぐ原子的claimや永続イベント一意キーは確認できない。両workerが同じ旧状態を読み、同一Pushを二重送信する競合が理論上ある。実測再現は未実施。
- Push成功後のDB insert失敗やwatch_states upsert失敗で通知とDBの状態がずれる恐れがある。送信結果不明時の無条件再送も避ける必要。

## 実施順
1. 現行worker・DB制約・PR #63の既存設計とテストを詳細照合。
2. 使い捨てDBで並行実行、送信成功後DB失敗、送信タイムアウト、状態更新失敗の再現テストを作る。
3. target/eventごとの永続claim、購読別試行、未知結果の運用を設計。pending採用ならDB移行順序と後方互換を先に確認。
4. CIと並行試験の後、明示承認を得て初めて本番DB/Edge/Pushを変更し、iPhoneで検証。

## 作業境界と次の一手
このチェックポイントは静的監査。コード修正・実測並行試験・本番変更は未実施。次はPR #63のテストとmainのworkerを突き合わせてオフライン失敗注入テストから着手する。

## 2026-10-28 既存試験と本番workerの突合（静的確認）

### 既存資産を再利用
- PR #63の `deliveryAttemptSafety.ts` は `CREATED → CLAIMED → ACCEPTED/FAILED_TERMINAL/UNCERTAIN` をモデル化。送信タイムアウト・lease切れを `UNCERTAIN` とし、再送不可にする。
- `tests/deliveryAttemptSafety.test.ts` には二重claim、lease期限切れ、タイムアウト、成功後再送、404/410、claimなしの結果、空worker ID、遅延した結果の8テストが**コードとして存在**。今回のテスト実行結果ではない。
- `docs/sql/my-rain-push-outbox-prototype.sql` は `UNIQUE(owner_id,target_id,event_key)` と `PRIMARY KEY(event_claim_id,subscription_id)` を設計済み。ただし `notification_id` が既存配信行へのNOT NULL FKで、現行 `delivered_count > 0` 制約下では**Push前のpending行を作れない**。先にDB移行設計が必要。

### 現行workerの問題箇所と故障注入の期待結果
| ケース | 現状の危険 | 修正後の必須条件 |
| --- | --- | --- |
| 同一targetに2 cronが同時到着 | 両者が同じwatch_statesを読み、二重Push可能 | 同一イベント/購読は一方だけが永続claim成功、送信権を持つ |
| Push受理→delivery insert失敗 | 端末には通知、履歴なし | 配信試行の永続記録と要調査状態を残し、無条件再送しない |
| Push受理→watch_states upsert失敗 | 次回も未通知と誤判定し得る | 配信claimが再送を抑え、状態修復は独立して行う |
| Push送信タイムアウト | 受理済みか不明 | UNCERTAINを記録し、自動再送せず照合対象とする |
| workerがclaim後にクラッシュ | 送信前/送信後を判別できない | lease期限切れだけで再送許可しない |
| 複数購読の一部のみ成功 | owner単位の履歴だけでは購読別結果が曖昧 | 購読別の試行・確定・不明を保持 |
| 404/410購読 | 無効購読が残る可能性 | 無効購読を終端化し、他購読の送信状態に影響させない |
| 3回連続NO_RAIN後の新エピソード | 古いevent_keyで新しい雨を抑止する危険 | イベントIDの世代更新を観測有効時刻と乾燥確定に紐づける |

### 未解決の設計判断
- `event_key` の雨エピソードIDをいつ生成/再生成するか。予報更新ごとにキーを変えると重複抑止が破綻する。
- 既存DB制約をどの順で安全に移行するか。workerを先に変更しない。
- Pushは外部サービスなのでDBと完全な原子的トランザクションにできず、**厳密な一度だけの端末到達保証はできない**。重複抑止と不明結果の安全な扱いを優先する。

**次の実装ゲート**：使い捨てPostgresの別接続2本で同時INSERT/claimを競争させ、同じevent_keyとsubscription_idで送信権が1件だけになるテストを作る。これが通るまで本番workerに接続しない。
