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
