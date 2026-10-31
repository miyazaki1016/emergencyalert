# 大雨予測継続性・保存設計（研究用、2026-11-01）

## 現状と制約
- 2026-10-31の SEVERE_RAIN #576（津南町）・#577（狐島）は、保存された気象庁ナウキャスト画像の中心画素で予測30〜50mm/h、対象時刻の実況はいずれも30mm/h未満。独立した地上雨量計による検証ではない。
- `rain_notification_evaluations` / `rain_evaluation_images` / `rain_area_shadow_results` は通知時点の一連の予測と後日実況の比較用。過去の異なる発表時刻の予測を比較する履歴としては不足。
- `rain_diagnostic_history` は存在するが、#576/#577の前回発表分の比較に使える完全なフレーム列は確認できなかった。
- 現行 `severeForecast` は未来の最大強度フレームを選択し、継続性を通知前に要求していない。

## 提案する保存単位（未実装）
- 地点ID、取得時刻、発表時刻（baseTime）、対象時刻（validTime）、予測状態（RAIN / NO_RAIN / UNKNOWN）、中心強度区分、中心画素、半径250m/500m/1kmの強雨占有率・利用可能画素率、元データ識別子・取得品質。
- 同一地点・同一発表時刻・同一対象時刻を一意に扱い、再取得と別発表を混同しない。
- 既存の画像・面判定データを再利用。画像バイナリの重複保存や無制限の保持を避け、保持期限と容量を事前評価する。
- 欠測・透明・雨なしを分離。発表時刻と対象時刻の整合性を確認し、通知後の再取得画像を「通知時点の原本」と断定しない。

## 研究用判定
`lib/research/severeRainConsistency.ts` は同一対象時刻に対する最新と前回の発表を比較し、PERSISTENT / NEW / ABSENT / UNKNOWN を返す。通知判定とは未接続。前回の対象時刻が未取得なら UNKNOWN とする。

## 検証計画
1. 現行診断と保存テーブルのデータ重複・容量・RLSを監査。
2. 通知に影響しない履歴収集の設計とテスト。DB変更・デプロイは別途レビュー。
3. 強雨の真陽性・偽陽性・見逃し・通知遅延を、予測リードタイム別（0〜30分、35〜60分）、急発達型・移動型、面積別に比較。強雨の真陽性データが集まるまで通知抑制ルールを本番適用しない。
4. #576/#577は予測と実況の既存画像を可視化し、1km外の雨域移動は別途広域データがない限り断定しない。

## 安全境界
本PRは研究用純粋関数・テスト・設計文書のみ。watch-rain、Push、Edge Function、本番DB、通知閾値には変更を加えない。

## 本番READ ONLY監査追記（2026-11-01）
- PR #109 の最新確認時、GitHub Actions verify / phase1-feedback-http / phase1-feedback-rls / rain-delivery-concurrency は全てsuccess。初回CIで発生したJMA日時パースの6件失敗は修正済み。
- `rain_diagnostic_history` は照会時46,214行、うち `diagnostic IS NULL` が45,913行、`diagnostic.forecastDetails` が空でないものは17行のみ。最終該当時刻は2026-10-27 01:05 JST。つまり現状の診断履歴だけでは発表別の継続性評価を再現できない。
- `rain_evaluation_images` は603行・約1.4MB、`rain_area_shadow_results` は42行・約520KB、`rain_diagnostic_history` は約14MB（照会時点）。件数は稼働中に変化する。
- `watch-rain/index.ts` のコード上は予測フレームを `diagnostic.forecastDetails` に付加してinsertする。ただし本番の保存行にほぼ反映されていないため、稼働版との不一致・APIが返すdiagnosticの形・書込経路をREAD ONLYで切り分ける必要がある。原因未確定。
- このギャップが解決するまで、既存診断履歴を予測継続性の証拠とみなさない。次の実装は新規DB書込ではなく、まず記録経路・スキーマ・保持期限の監査を優先。
