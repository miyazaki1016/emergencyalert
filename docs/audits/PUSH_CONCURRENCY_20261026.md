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

## 2026-10-28 ユーザー実例：「雨が降っていないのに止むよ」／歯抜けの雨雲

**第1優先の意味を訂正**：ユーザーの主眼は「誤った降る／止む通知を減らすこと」。技術的な重複Push/障害対策は別トラックとして保持し、通知内容・タイミングの判定改善を先行して調査する。ユーザー仮説：中心画素の歯抜けで状態が揺れる。直前に**実際に送った通知**と、その後に雨が継続したかを組み合わせたい。

### mainのコード追跡（静的確認）
- `notificationDecision.ts/advanceObservationStreak`：新しい有効時刻の `RAIN` は rain_streak+1、`NO_RAIN` は rain_streak=0。逆も同様。**一回の歯抜けで連続雨カウントは0に戻る**。同じ観測時刻やUNKNOWNはカウントしない。
- `watch-rain/index.ts`：`confirmed_weather` は rain_streak>=3 で RAINING、clear_streak>=3 で DRY。それ以外は以前の値を**維持**。歯抜け1〜2回では古いRAININGが残る。
- `rainEnding` は `eventType === RAIN_ENDING`、直前eventがRAIN_ENDINGではない、`rain_ending_notified` がfalse、**confirmed_weatherがRAINING**等で成立し得る。**現在のrain_streak>=3を必須にしていない**。
- `confirmedAndEnding` は rain_streak>=3、まだrain_confirmed_notifiedでない、かつ eventType=RAIN_ENDING で成立。**同じ判定サイクル内に雨確認と止む予測が重なる**ケースがある。
- `rain_confirmed_notified` は実際のPush成功ではなく rain_streak>=3 でtrueになり得るため、変数名と「実際に通知済み」の意味が一致しない。
- `last_notified_at` は最後のPush時刻だけで、**直前の配信種類（降る／止む）とその後の観測履歴を明示的に結び付けていない**。一方 `rain_ending_notified` は止む通知の送信済み状態を持つ。
- 以上はコード上の経路。実際の誤通知の原因と断定するには、その通知時点のrain_diagnostic_historyとnotification_deliveriesの時系列照合が必要。

### 最小再現シナリオ（これからテスト化）
1. 有効時刻の異なるRAINを3回観測 → confirmed_weather=RAINING。
2. NO_RAINを1回（歯抜け） → rain_streak=0、clear_streak=1、confirmed_weatherはRAININGのまま。
3. その時点で予報eventがRAIN_ENDINGに変わる → 条件次第で「止むよ」を送る。実際に地上で降っていたかは不明。
4. 直前の実送信が「降るよ」でも、送信後に地上雨を確認できていなければ「止むよ」を保留する候補を比較。

### 次の作業
- `RAIN, RAIN, RAIN, NO_RAIN, RAIN_ENDING` と `RAIN, NO_RAIN, RAIN, NO_RAIN` を含む純粋関数の回帰テストを追加。
- 直前に**実送信成功**したイベント種別と、通知後の**新規の有効時刻**での観測を区別する設計。直前の通知だけで降雨を証明しない。
- 点／面／併用による歯抜け対策は研究ブランチで精度比較。地上雨の独立観測なしに「正解」とは呼ばない。
- 本番のPush条件・DB・Edgeは変更しない。

## 2026-10-28 ユーザー確定：アメふるの最重要価値と評価順

**最優先の製品価値は「降るよ」を、実際に降り始める前に、できるだけ正確に届けること。** 誤報だけを減らして通知が遅くなる・見逃すのは成功ではない。

### 通知別の非対称な優先度
1. **「降るよ」最優先**：地点ごとの降り始めに先行して通知。誤報率・見逃し率・通知リードタイムを**同時に**評価する。
2. **大雨警戒**：危険な雨の見逃しと通知遅れを重視。
3. **「止むよ」補助**：過去に雨を予測しただけでは送らない。直前の実送信イベント種別、通知後の新規有効時刻での雨観測、歯抜けによる状態の揺れを考慮し、根拠不足なら保留する。

### 優先研究・実装の順番
A. 現行「降るよ」の通知条件・予測時刻と、実際の雨開始時刻の関係をテストで再現する。3回連続観測の待ちが通知リードタイムを失わせていないか確認する（予報フレームと現在観測の連続性は区別）。
B. 中心点、周辺雨域、点＋面併用で、歯抜け時の見逃し・空振り・リードタイムを比較する。独立した地上観測なしに精度向上を宣言しない。
C. 「止むよ」の履歴・状態条件を強化する。ただし「降るよ」の配信を遅らせる共通ゲートにはしない。
D. 技術的な二重Push・DB障害は別の安全対策トラック（Issue #64）として保持し、ユーザー体験上の通知判定改善と混同しない。

**今回の変更は方針の記録のみ。通知判定コード・DB・Edge・本番Pushは無変更。**
