# アメふる — 新チャット引継ぎ総覧（2026-10-18）

> この文書は旧チャットからの引継ぎ追加分。既存の `docs/AMAFURU_SOURCE_AUDIT_20261016.md`（約53KBの発掘台帳）、`docs/PROJECT_OVERVIEW.md`、最新のMain・各Preview PRのソースと必ず突き合わせる。**本番が最先端とは限らない。** ソース・テスト・CI・Preview・本番実測を混同しない。
>
> **ユーザー語彙：「りょ」＝了解、次の合意済み作業を実際に進めて。** ただしMain変更、Preview変更、merge、deploy、本番DB/Push変更、費用発生の承認ではない。新チャットで返事だけを繰り返さず、実際に調査・検証して結果を返す。

## 0. ユーザーの優先順位と原点

- 目標は気象データの羅列ではなく、暮らしの行動に間に合う親しみやすい言葉：「おかあさん、そろそろ雨が降ってきそうですよ。洗濯物は大丈夫？」
- **現在の３本柱**：
  1. **MYアメふる**：GPS現在地と登録監視地点について**30分以内の雨予測**を生活行動に役立つPushで伝える。GPSのフォアグラウンド/バックグラウンド権限と実装を混同しない。
  2. **全国大雨速報**：全国で**30分以内に30mm/h以上**が予測される地域を自動検出し、**ポータルトップにX投稿風の速報**として表示。MY地点Pushとは別の配信先。雨域ポリゴンと行政界の実交差で町・丁目の地名まで目指す。
  3. **LIVE JAPAN**：日本列島が生きているように見える地図体験。PR #61のPreview実装を踏まえ、**実データ**を共通エンジンから表示。将来の地震等の構想と現段階の完成条件を分離。
- **雨の判定エンジンは１つ。** 気象庁データの観測/予報、強度、予測時刻、地点・領域、根拠と鮮度、UNKNOWN≠NO_RAINを共通化。地点ごとの問い合わせ・全国走査など入口や解像度、利用者側の配信ルールは別でもよい。現行が完全統合済みとは主張しない。
- **DB復旧・運用整備はユーザー判断で一旦保留**。機能開発優先。復旧資産は消さず、実際の依存が証明された時のみ障害として扱う。
- **原則：地域を省略しない。重複計算だけを省略する。**

## 1. 調査・開発の実績（ソース裏付け）

- GitHub: `miyazaki1016/emergencyalert`。全PR #1–#62を個別確認した時点で **56 merged、#21 closed-unmerged（後継#23）、5 open (#25, #59, #60, #61, #62)**。その後の状態は再確認する。
- 約64ブランチを一覧・多くをMainと比較。**ahead/behindやmergedを本番稼働と誤認しない**。
- **既存調査台帳**：`docs/AMAFURU_SOURCE_AUDIT_20261016.md`、隔離ブランチ `docs/amafuru-source-audit-20261016`、前回成功コミット `54d3bac450a7e68065cbc5c99905e077c8a5b0f3`。巨大追記は安全チェックによりブロックされたことがあり、失敗した更新を完了扱いしない。
- **全国大雨速報 PR #59**：`feat/national-heavy-rain-preview`、open/unmerged。全国走査・JMAタイル・N03自治体ポリゴン・雨域交差・queue/workerの大規模Preview/proof。All47幾何/所有権proof、502 chunks/591 queries同値、約32MiBキャッシュproof、deadline-tail cancellation proofあり。しかし**実Preview worker routeはまだ証明済みpartitioned loader / region ownership / queue-aware dispatcher / AbortSignal経路に完全接続されていない**。固定cron primary+drain limit50案は却下。Production readiness NO。勝手にcron、Vault、Storage、DBを変更しない。
- **PR #62**：`test/z4-stride-parity-20261016`。実JMA Z4 stride-2は6フレームで≥30mm/hピクセルの**76.54%を見落とした**検証。粗い走査を安全な除外条件に使わない。Z6→Z8→Z10のbounded parity 6/6は全国完全証明ではない。
- **町・丁目**：`scripts/census-town-boundary-topojson-proof.ts` で国勢調査2020小地域TopJSONの**江東区塩浜一丁目/二丁目**実ポリゴン交差と境界曖昧性をオフラインproof。**研究用・ライセンス未確認・全国coverage/本番Storage昇格なし**。 `townBoundaryManifest.ts`, `townBoundaryDatasetValidation.ts`, `townBoundaryGeometry.ts` はmanifestの所有権・SHA256・bytes・feature count・リング幾何のpreflight。行政名の表示（塩浜一丁目/二丁目を塩浜にまとめる等）は幾何とは別段階。
- **N03と町丁目は別**：全国47都道府県のN03は市区町村境界であり町丁目データではない。北海道9,556ポリゴン要素・46個約1MiB chunks＋分割不可約1.27MiB等のproof。1.5MiB packagingで岩手県の分割不能な巨大要素（約4.33/2.59/3.03MiB）に失敗したCIの後続修正有無を再追跡。塩浜TopoJSON外部取得でCI #785 ECONNRESET、retry追加の後続成功確認が必要。
- **LIVE JAPAN PR #61**：`feat/live-japan-experience-prototype`、open/draft、8ファイル規模。地図UI・イベントモデルの試作。公式地震データ/本番Push等の完成を勝手に宣言しない。
- **美咲連携 PR #60**：設計契約のみのdraft。アメふるから天気/災害情報をread-onlyに提供し、美咲側で同じ気象取得処理を重複実装しない。現３本柱の完成を妨げない。

## 2. MYアメふる通知：実コードを読んで特定した論点

### データ経路
`app/api/rain/route.ts` (Main) は `JmaPublicImageProvider` から観測・予報を取得し、`RainInterpretationEngine.ts` → `canPublishRainInterpretation.ts` → `toRainSemanticEvent.ts` を経てAPI応答。
`supabase/functions/watch-rain/index.ts` (Main) は登録監視地点ごとに `https://emergencyalert-gilt.vercel.app/api/rain` を呼び、`rain_diagnostic_history` に診断を記録し、`watch_states` で履歴を管理、Push成功時は `notification_deliveries` に記録。**稼働中のEdge FunctionがGitHub Mainと同一バージョンか未照合**。

### 「降るよ」がないのに「止みます」ばかりというユーザー実感
- `RainInterpretationEngine.ts` の `ACTIONABLE_RAIN` は原則 **5mm/h以上**、または **1–5mm/hの5分間隔3フレーム連続**が30分以内。単なる弱い雨の接近は `RAIN_AHEAD` で `urgency=INFO` となり、通常Pushを発火しない。**原点の「30分以内に降るよ」要件と一致するか要再設計**。誤報・通知過多とのバランスを検証する。
- 現在雨が降っている場合、engineは `ENDING` を含む状態に遷移するが `shouldNotify=false`、Push側の独立した終了条件で送信され得る。
- `watch-rain/index.ts` は `rainEnding` に `previous.confirmed_weather==="RAINING"` を要求している。ただし別経路 `confirmedAndEnding = rainConfirmed && eventType==="RAIN_ENDING"` を OR で通知判定へ渡す。**過去に「降るよ」を配信したか確認しないまま「もうすぐ止みそう」が送れる**。これは仕様上妥当なケースもあるため、実配信の原因確定とは区別。
- `initialRaining=false` 固定のため現在降雨開始の初回通知が抑制されている。理由・要件の確認が必要。
- `nextRainEndingNotified` は `rainStreak>=3` で再武装される。降雨エピソードを跨いだ重複/連続通知の時系列テストが必要。
- **日時の具体的不整合**：`RainInterpretationEngine.ts` はJMA `YYYYMMDDHHmmss` を専用parserでUTC変換する一方、`watch-rain/index.ts` の `severeFrame` 判定は `new Date(f.validTime)`。14桁JMA文字列はJavaScript Dateで通常解釈できず、**強雨予報を見逃し得る**。強雨予報の上限30分も通知worker単独では明示されていない。型・時刻基準・境界を揃える。
- APIが `interpretationEnabled=false` / event null の時はUNKNOWN扱いで通知しない。正しいfail-closedだが「降るよ」が少ない理由の可能性として診断履歴照合が必要。
- Pushは `notification_deliveries` に成功配信分のみ記録。**本番DB実測、ユーザー端末配信の照合、再現テスト実行はまだ未実施**。ソース上の原因候補を実障害の確定原因と呼ばない。
- 既存テスト `lib/weather/rain/watchNotificationDecision.test.ts` は個別通知判定と終了ラッチを検証するが、雨接近→現在雨→終了の一連の降雨エピソード統合テストが不足。

### 今回追加した隔離テスト
- ブランチ `test/watch-rain-notification-regression-20261018`（Main起点）、コミット **`1dc454434c8cdf31f12554e6fab372a5496e0a6b`**。
- `lib/weather/rain/watchNotificationDecision.test.ts` に「先行approach配信履歴を必要とせずendingを許可する現挙動」「JMA14桁日時をnative Dateがparseできない」**characterization tests**を追加。
- **CI実行・成功は未確認**。これは不具合修正ではない。Main/Preview/本番Push未変更。
- `fix/rain-ending-after-confirmed-rain`、`fix/rain-ending-hysteresis` 等の過去ブランチ差分を精査して既存の改善を再利用する。

## 3. これからの実行順序（次のソラへの作業指示）

1. **最新状態再確認**：Main、PR #59/#61/#62、隔離テストブランチ、既存監査総覧、CI status、デプロイと本番DBは読み取りのみ（アクセス可能なら）。この文書の日付以降の差分を反映。
2. **通知の時系列テストを実際に実行/確認**：弱雨→30分接近→降り始め→降雨確定→止み予報→乾燥、UNKNOWN、データ欠損、時刻境界、通知off、複数監視地点、重複Push、再降雨。ユーザーの「止みますばかり」を再現する。テストが通っただけでユーザー期待を満たしたと誤認しない。
3. **修正設計**：JMA時刻parse共通化、30分窓、降雨エピソード識別、予告/終了通知の優先順位、実用的な弱雨通知閾値と重複抑制。終了通知を機械的に全面禁止せず、予報根拠とユーザー体験を揃える。
4. **共通雨エンジン照合**：MY地点API、全国PR #59のpolygon scan、LIVE JAPAN PR #61の表示データの意味論・再利用可能モジュール・二重判定をコードベースで比較。１エンジン３利用先の実装計画を証拠付きで作る。
5. **全国地名データ**：N03市区町村と国勢調査町丁目を分け、全国ライセンス・出典・所有権・manifest・SHA・安全なサーバ格納・分割/読込予算・CI結果・Preview統合のゲートを順に閉じる。
6. **LIVE JAPAN**：PR #61の実ファイルを読み、ダミー/実データ・イベント層・表示層を分離して共通エンジンへ接続する最小経路を確認。
7. **証跡と報告**：変更したファイル、ブランチ、コミット、CI、未検証、阻害点を総覧に追記。**実行していない作業を「進めた」「完成」と表現しない。**

## 4. 安全と開発の境界

- 本番・Main・Previewのデプロイ、DB/cron/Storage/Push、merge、秘密鍵、有料APIは事前の明示承認なしに変更しない。
- ユーザーは旧チャットの終了に際し「今までやってきたことをすべて総覧にまとめて引き続き準備」を依頼。**この引継ぎ文書は監査用の隔離ブランチにのみ保存**。本番変更ではない。
- **状態の語彙**：本番稼働確認 / Main実装（本番未照合）/ Preview実装 / offline proof / 設計のみ / 未実施。区分の曖昧化禁止。
- 美咲連携、S-net、無料地震データ、将来の生活情報は構想・別検討。今の完成対象３本柱から逸れない。
