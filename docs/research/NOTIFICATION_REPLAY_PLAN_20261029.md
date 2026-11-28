# 通知の予測・実況答え合わせ基盤 — 設計 v0.1 (2026-10-29)

## 状態
設計のみ。Push/DB/本番ロジック未変更。実際の通知送信経路の全コードと現行DBのライブ構成は未監査。ここに書く列・処理は実装済みを意味しない。

## ユーザー決定
- 第1段階は「登録地点で実際に通知された『降るよ』『止むよ』」だけを評価対象にする。
- 予測時点の気象庁ナウキャスト vs 予測対象時刻の**実況解析**の一致（レーダー評価）を先行する。
- 「本当に地上で降った／止んだ」は独立した地上雨量観測との照合として**別評価**。近傍観測と本人地点の真値を同一視しない。
- 通知の送達・遅延は第3の評価軸。利用者の回答は偏りがあるため補助情報。
- 判定ロジックは変えず、先に再現可能な記録・検証を整備する。

## 現物から確認した再利用点
- `app/api/rain/route.ts`: observation と forecast を並行取得し、interpretRainSeries に渡す。レスポンスに checkedAt/sourceValidAt, interpretation, event, forecast を含む。
- `lib/weather/providers/jma/JmaPublicImageProvider.ts`: getObservationFrames は最新1時点、getForecastSeries は対象時刻列。JMA PNG の z10 タイルから地点1画素の RGBA を取得し分類。現在の実装は**画像全体の保存ではない**。
- `lib/weather/rain/RainInterpretationEngine.ts`: firstRainTime / firstActionableRainTime / endingTime を返す。
- `docs/PROJECT_OVERVIEW.md`: watch_targets, watch_states, notification_deliveries, rain_notification_feedback の既存構成を記載。古い配信履歴には予測対象時刻が保存されておらず、事後的な正解率計算は不可。
- `docs/research/RAIN_FIELD_MORPHOLOGY_PLAN.md`: 点画素・周辺密度の研究は別件。実地上観測による精度評価は未実施。

## 必須の追加記録（提案）
1. 通知イベントに対応する不変の evaluation ID、既存 notification_deliveries ID、watch_target ID、イベント種別、判定/送信/配信時刻。
2. 判定時点の入力：JMA basetime/validtime、取得時刻、観測と未来フレームの status/intensityClass/RGBA、対象画素と取得成否、expectedFrames、解釈エンジンのバージョン。可能なら入力タイルを再現できるURL/ハッシュも。ただし長期保存可否は利用条件・容量を先に確認。
3. 判定結果：state, shouldNotify, firstRainTime, firstActionableRainTime, endingTime、通知対象の予測時刻、通知文面・イベント種別、採用/抑制理由。**後から計算した値を当時の入力として上書きしない**。
4. 実況照合：評価対象のvalidtime、実況取得時刻、観測status/intensityClass/RGBA、データ鮮度、判定結果と理由。実況データ欠損は「判定不能」であり「雨なし」ではない。
5. 将来の地上雨量評価：雨量計ID、距離、観測期間/時間分解能、観測値、観測品質。レーダーとの一致とは別列。
6. 配信品質：queued/attempted/accepted/failed/unknown、retry、重複排除キー。現行のDELIVERED_COUNT制約やPush workerの処理に未確認の変更を加えない。

## 評価規則（初期案・確定前にテスト）
- 「降るよ」: 予測対象時刻周辺の実況で降水解析が現れたか。予測対象時刻の一致に加え、許容誤差（例 ±5/10分）は**別指標**にする。
- 「止むよ」: その時刻に雨がないだけでは不十分。通知前に雨が存在し、予測対象時刻以降の複数実況フレームで終了が持続するかを確認する。一時的な歯抜けを成功扱いしない。
- 判定: MATCH / MISMATCH / INDETERMINATE。UNKNOWN_PIXEL, FETCH_ERROR, NO_DATA, OUT_OF_COVERAGE、未到達の観測時刻、時刻不整合はINDETERMINATE。
- 観測は予測対象時刻の**実況解析フレーム**を採用し、同時刻の未来予報を実況と取り違えない。対象時刻が過ぎてから取得する。更新遅延に備えて再試行上限を設ける。
- 旧通知には予測時刻を捏造しない。対象は新規通知から。
- 通知がなかった雨（見逃し）は第2段階のシャドーサンプリングで測る。第1段階の数値を全体の的中率/見逃し率と呼ばない。

## 安全な実装順序
1. 現行の**実送信処理**と notification_deliveries の INSERT/確定・重複防止をコードで特定し、実DBを読み取り専用で照合。既存 Issue #64 / PR #63 と競合しないか確認。
2. 既存Push経路に障害を波及させない記録方法を設計。通知の成功・失敗と予測スナップショットを相関IDで結ぶ。記録失敗時は通知を止めないが、欠測を監視できるようにする。
3. 別ブランチに純粋関数の実況照合器とテスト（降り始め、終了持続、歯抜け、取得失敗、時刻ずれ）を作成。
4. 本番DB変更を伴わないCIの使い捨てPostgresでスキーマ/RLS/保持期間/容量を検証。
5. 本番DB移行・Push worker/cron変更・mainマージ・公開は個別の明示承認後に実施。

## 次の一手
通知の実送信コードと既存DBの読み取り専用照合を完了し、保存接続点を確定する。現時点でその箇所の確認が完了したとは言わない。

## 2026-10-29 実運用経路・本番スキーマの読み取り専用照合【完了】
- Supabase 本番 EmergencyAlert の ACTIVE Edge Function `watch-rain` version 31 を**読み取りのみ**で確認。cron認証後に有効 watch_targets を最大100件取得し、各地点について公開 `/api/rain?lat=...&lon=...` を呼び出す。結果は `rain_diagnostic_history` に一部保存し、`watch_states` で前回イベント/連続実況/抑制状態を判断。
- Push経路：`shouldNotify` → `push_subscriptions` を取得 → 購読ごとに `webpush.sendNotification` → delivered > 0 の場合だけ `notification_deliveries.insert` → `watch_states.upsert`。**送信後に配信履歴を INSERT**するため、送信成功と履歴書込み失敗の間にギャップがある。今の経路にDB書込みを挿入する場合、通知停止・二重送信・記録欠落を招かないよう別途設計が必要（Issue #64）。
- `watch-rain` は `rain.forecast` の `baseTime/validTime/status/intensityClass/rgba` を受け取っているが、通知履歴には残していない。 `rain_diagnostic_history` への記録は `diagnostic` が通常時にはnullとなり得るため、**全通知の予測根拠の完全保存を保証しない**。
- 通知の種別・予測対象時刻の決め方が一律ではない：強雨 `SEVERE_RAIN` は `severeFrame.validTime`、雨接近は `rain.event.actionableAt` / `startsAt`、終了は `rain.event.endingAt` を候補にする。実際の送信種別 `notificationEventType` は rain.event.eventType と異なることがある。**送信した通知種別に基づいて対象時刻を決定**する必要がある。
- 現行本番 `notification_deliveries` カラムは id,owner_id,target_id,event_type,urgency,title,body,delivered_at,delivered_count,created_at の10件。予測対象時刻・判定根拠は存在しない。 `watch_targets` には登録地点の緯度経度があるが、評価時に地点が編集・削除される可能性があるため、当時の地点識別/位置の保全方針が必要。
- 現行本番 `watch_states` は `last_event jsonb`、`last_checked_at`、`last_notified_at`、`rain_ending_notified`、`clear_streak`、`rain_streak`、`confirmed_weather` 等を保持。これは**最新状態で上書きされる**ため過去通知の完全再生には使えない。
- 注意：`webpush.sendNotification` の成功はPushサービスへの受理であり、端末への表示・利用者の閲覧を保証しない。「配信済み」はこの意味に限定する。
- 既存の Edge Function / 本番DB / Push / cron に変更なし。読み取り結果に秘密値が含まれる可能性があるため、関数ソース全体や設定値を設計書に転載しない。

### 推奨する最小実装の接続点
- `watch-rain` の **shouldNotify が確定した後、Push送信前** に通知候補の不変スナップショットを構成する。ただし永続化と実送信の順序は既存 #64 と整合させるまで確定しない。
- `notification_deliveries.id` との紐付けは、現状 `insert` の返却IDを使っていないため、`insert(...).select('id').single()` 等の改修が候補。ただし失敗時の取り扱いと重複防止を先に設計する。
- 最初は **独立した評価レコード** を検討。現行 `notification_deliveries` の制約・配信処理を直接変えるのは避ける。DB移行、Edge更新、cron変更は別途承認を取る。
- 次工程：この照合結果を前提に、保存形式・照合器の純粋関数・単体テストを専用ブランチで追加する。実データの正解率はまだ算出できない。
